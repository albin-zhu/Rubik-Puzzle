// 一些基础配置
var kGemSize = 40;
var kBoardWidth = 8;
var kBoardHeight = 6;
var kNumTotalGems = kBoardWidth * kBoardHeight;
var kNumTypes = 6;

// 状态机
var kStateIdle               = 0;
var kStateTouchDown          = 1;
var kStateTouchMove          = 2;
var kStateInfoConnected      = 3;
var kStateTouchEnd           = 4;
var kStateRemoveGems         = 5;
var kStateDropGems           = 6;
var kStateCheckBoard         = 7;
var kStateLength             = 8;


var kTotalGameTime = 1000*1000;

var gStateMachines;

var gSelectGem;

var gCurState;


function caculateScore(n)
{
    return 5 * n * n;
}


function genType(t1, t2, t3)
{
    var arr = [];
    for(var i = 0; i < kNumTypes; i++)
    {
        if(i != t1 && i != t2 && i != t3)
            arr.push(i);
    }

    var t = arr[Math.floor(Math.random() * arr.length)];
    cc.log(t1 + ", " + t2 + ", " + t3 + ", " + t);
    return t;
}

//
// GameScene class
//
var GameScene = cc.Layer.extend({
    fallingGems : null,
    board : null,
    boardSprites : null,
    gemLayer : null,
    particleLayer : null,
    shimmerLayer : null,
    effectsLayer : null,
    timer : null,
    startTime : null,
    isGameOver : null,
    scoreLabel : null,
    complementGem : null,
    lastPos : null,
    lastDirection : null,
    connectedGems : [],
    gameInit : false,
    infoLabel : null,
    lockSprite : null,
    hMarker : null,
    vMarker : null,
    hGems : null,
    vGems : null,
    score : 0,
    waitFrames : -1,
    onDidLoadFromCCB : function()
    {
        var w = cc.Director.getInstance().getWinSize().width;
        if(w > kBoardWidth * kGemSize * 2)
        {
            kGemSize *= 2;
        }
        // Setup board
        this.setupBoard();
        this.boardSprites = new Array(kNumTotalGems);

        this.fallingGems = new Array(0);

        this.connectted = new Array(0);

        this.hGems = new Array();
        this.vGems = new Array();

        this.gameInit = false;
        this.score = 0;
        this.isGameOver = false;

        // Setup timer
        this.sprtTimer.setVisible(false);
        this.timer = cc.ProgressTimer.create(cc.Sprite.create("gamescene/timer.png"));
        this.timer.setPosition(this.sprtTimer.getPosition());
        this.timer.setPercentage(100);
        this.timer.setType(cc.PROGRESS_TIMER_TYPE_BAR);
        this.timer.setMidpoint(cc.p(0, 0.5));
        this.timer.setBarChangeRate(cc.p(1, 0));
        this.sprtHeader.addChild(this.timer);

        this.rootNode.schedule(function(dt){this.controller.onUpdate(dt);});

//        if ("opengl" in sys.capabilities)
//        {
//            cc.log("On mobile");
//            this.particleLayer = cc.ParticleBatchNode.create("particles/taken-gem.png", 250);
//            this.gemLayer = cc.SpriteBatchNode.create("crystals.png");
//        }
//        else
        {
            cc.log("On web");
            this.particleLayer = cc.Node.create();
            this.gemLayer = cc.Node.create();
        }

        // init Game Layer
        this.initGameLayer()


        this.rootNode.animationManager.setCompletedAnimationCallback(this, this.onAnimationComplete);

        this.setupShimmer();

        this.scoreLabel = this.lblScore;

        this.initStateMachines();

        this.initCompelementGem();
        this.initMarker();
        this.initDropGems();

        // Forward relevant touch events to controller (this)
        this.rootNode.onTouchesBegan = function( touches, event)
        {
            this.controller.onTouchesBegan(touches, event);
        };

        this.rootNode.onTouchesMoved = function(touches, event)
        {
            this.controller.onTouchesMoved(touches, event);
        };

        this.rootNode.onTouchesEnded = function(touches, event)
        {
            this.controller.onTouchesEnded(touches, event);
        }

        this.rootNode.setTouchEnabled(true);

        var d = new Date();
        this.startTime = d.getTime();
    },

    initGameLayer : function()
    {
        this.gemLayer.setContentSize(this.gameLayer.getContentSize());
        this.gemLayer.setPosition(cc.p(kGemSize * 0.5, kGemSize * 0.5));
        this.shimmerLayer = cc.Node.create();
        this.effectsLayer = cc.Node.create();

        this.gameLayer.addChild(this.shimmerLayer, -1);
        this.gameLayer.addChild(this.particleLayer, 1);
        this.gameLayer.addChild(this.gemLayer, 0);
        this.gameLayer.addChild(this.effectsLayer, 2);

        this.infoScoreLabel = cc.LabelTTF.create("1234567890ASDFGHJKSDLF", "Arial", 24);
        var size = cc.Director.getInstance().getWinSize();
        this.infoScoreLabel.setPosition(cc.p(size.width / 2, kGemSize * (kBoardHeight + 1)));
        this.gameLayer.addChild(this.infoScoreLabel);


    },

    initCompelementGem : function()
    {
        this.complementGem = cc.Sprite.createWithSpriteFrameName("crystals/0.png");
        this.complementGem.setAnchorPoint(cc.p(0.5, 0.5));
        this.gemLayer.addChild(this.complementGem);
        this.complementGem.setVisible(false);

        this.lockSprite = GridSprite.createWithType(5);
        this.lockSprite.inLock = false;
        this.lockSprite.setAnchorPoint(cc.p(0.5, 0.5));
        this.lockSprite.setGrid(kBoardWidth - 1, kBoardHeight + 1);
        this.lockSprite.setPosition(cc.p(kGemSize * (kBoardWidth - 1), kGemSize * (kBoardHeight + 1)));
        this.gemLayer.addChild(this.lockSprite);
        
        var s = cc.Director.getInstance().getWinSize();
        var w = s.width / kNumTypes;
        var h = kGemSize * (kBoardHeight + 3);
        
        for(var i = 0; i < kNumTypes; i++)
        {
        	var sp = GridSprite.createWithType(i);
        	sp.setPosition(cc.p(w * i, h));
        	this.gemLayer.addChild(sp);
        }
    },

    initMarker : function()
    {
        var width = kBoardWidth * kGemSize;
        var height = kBoardHeight * kGemSize;

        this.vMarker = cc.Sprite.createWithSpriteFrameName("crystals/vmarker.png");
        this.hMarker = cc.Sprite.createWithSpriteFrameName("crystals/hmarker.png");

        var size = this.vMarker.getContentSize();
        this.hMarker.setScaleX(width / size.width);
        this.vMarker.setScaleY(height / size.height);

        this.vMarker.setAnchorPoint(cc.p(0.5, 0));
        this.vMarker.setPosition(cc.p(0, -kGemSize / 2));
        this.hMarker.setAnchorPoint(cc.p(0, 0.5));
        this.hMarker.setPosition(cc.p(-kGemSize / 2, 0));

        this.hMarker.setVisible(false);
        this.vMarker.setVisible(false);

        this.gemLayer.addChild(this.hMarker, -1);
        this.gemLayer.addChild(this.vMarker, -1);
    },

    initDropGems : function()
    {
        var y = 0;

        this.rootNode.schedule(function(dt)
        {
            this.controller.initDropGems_(y);
            y++;
        }, 0.1, kBoardHeight - 1);
    },

    initDropGems_ : function(y)
    {
        for(var x = 0; x < kBoardWidth; x++)
        {
            var idx = x + y * kBoardWidth;
            var gemType = this.board[idx];
            var gem = GridSprite.createWithType(gemType);
            gem.setPosition(cc.p(x * kGemSize, kBoardHeight * kGemSize));
            gem.setAnchorPoint(cc.p(0.5, 0.5));
            gem.yPos = kBoardHeight;
            gem.ySpeed = 0;
            gem.setGrid(x, y);
            this.fallingGems.push(gem);
            this.gemLayer.addChild(gem);
        }
        y++;

        if(y >= kBoardHeight)
        {
            this.gameInit = true;
        }
    },

    onTouchesBegan : function(touches, event)
    {
        if(gCurState > kStateTouchEnd || this.isGameOver)
            return;

        this.changeState(kStateTouchDown);

        this.lastDirection = 0;// 没有方向
        var loc = touches[0].getLocation();

        loc = cc.pSub(loc, this.gameLayer.getPosition());
        gLastPos = loc;

        var x = Math.floor(loc.x/kGemSize);
        var y = Math.floor(loc.y/kGemSize);

        if(x == this.lockSprite.x && y == this.lockSprite.y && this.lockSprite.inLock == true)
        {
            this.lockSprite.inLock = false;

            this.lockSprite.highLight(false);
            this.changeState(kStateTouchEnd);
            this.unlockTen();
            return;
        }

        if(this.lockSprite.inLock == true)
        {
            var x = gSelectGem.x;
            var y = gSelectGem.y;
            this.hGems.splice(0, this.hGems.length);
            this.vGems.splice(0, this.vGems.length);

            for(var i = 0; i < kBoardWidth; i++)
            {
                gemSprite = this.boardSprites[i + y * kBoardWidth];
                if(i == x)
                    this.hGems.push(gSelectGem);
                else
                    this.hGems.push(gemSprite);
            }

            for(var j = 0; j < kBoardHeight; j++)
            {
                gemSprite = this.boardSprites[x + j * kBoardWidth];
                if(j == y)
                    this.vGems.push(gSelectGem);
                else
                    this.vGems.push(gemSprite);
            }

            this.lockSprite.setGemType(gSelectGem.gemType);
            this.lockSprite.highLight(true);
            this.lockSprite.inLock = true;
            return;
        }

        if(x >= kBoardWidth || y >= kBoardHeight)
            return;

        var idx = x + y * kBoardWidth;

        var gemType = this.board[idx];
        var gemSprite = this.boardSprites[idx];;
        var ac = cc.RotateBy.create(0.2, 30);
        gemSprite.runAction(cc.RepeatForever.create(ac));
        gSelectGem = gemSprite;

        this.vMarker.setVisible(true);
        this.hMarker.setVisible(true);
        this.vMarker.setPosition(cc.p(x * kGemSize, -kGemSize / 2));
        this.hMarker.setPosition(cc.p(-kGemSize / 2, y * kGemSize));


        this.hGems.splice(0, this.hGems.length);
        this.vGems.splice(0, this.vGems.length);

        for(var i = 0; i < kBoardWidth; i++)
        {
            gemSprite = this.boardSprites[i + y * kBoardWidth];
            if(i == x)
                this.hGems.push(gSelectGem);
            else
                this.hGems.push(gemSprite);
        }

        for(var j = 0; j < kBoardHeight; j++)
        {
            gemSprite = this.boardSprites[x + j * kBoardWidth];
            if(j == y)
                this.vGems.push(gSelectGem);
            else
                this.vGems.push(gemSprite);
        }

        this.lockSprite.setGemType(gSelectGem.gemType);
        this.lockSprite.highLight(true);
        this.lockSprite.inLock = true;


        var d = new Date();
        gLastMoveTime = d.getTime();
    },

    onTouchesMoved : function(touches, event)
    {
        // judge the state
        if(gCurState < kStateTouchDown || gCurState > kStateTouchEnd)
            return;

        var loc = touches[0].getLocation();

        var needCheck = false;

        loc = cc.pSub(loc, this.gameLayer.getPosition());

        var op = gLastPos;
        gLastPos = loc;

        var dx = loc.x - op.x;
        var dy = loc.y - op.y;

        var y = gSelectGem.y;

        if(this.lastDirection == 0)
        {
            if(Math.abs(dx) > Math.abs(dy))
            {
                this.lastDirection = 1;
                this.vGems.splice(0, this.vGems.length);
            }
            else
            {
                this.lastDirection = 2;
                this.hGems.splice(0, this.hGems.length);
            }
        }
        else if(this.lastDirection == 1)
        {
            if(Math.abs(dy) > 4 * Math.abs(dx))
            {
                this.sockHGems();
                var x = gSelectGem.x;
                var y = gSelectGem.y;
                var gemSprite;
                var gemType;
                for(var j = 0; j < kBoardHeight; j++)
                {
                    gemSprite = this.boardSprites[x + j * kBoardWidth];
                    if(j == y)
                        this.vGems.push(gSelectGem);
                    else
                        this.vGems.push(gemSprite);
                }

//	    this.vMarker.setPosition(cc.p(x * kGemSize, -kGemSize / 2));
                this.lastDirection = 2;
            }
        }
        else if(this.lastDirection == 2)
        {
            if(Math.abs(dx) > 4 * Math.abs(dy))
            {
                this.sockVGems();
                var y = gSelectGem.y;
                var x = gSelectGem.x;
                var gemSprite;
                var gemType;
                for(var i = 0; i < kBoardWidth; i++)
                {
                    gemSprite = this.boardSprites[i + y * kBoardWidth];
                    if(i == x)
                        this.hGems.push(gSelectGem);
                    else
                        this.hGems.push(gemSprite);
                }
                this.lastDirection = 1;
            }
        }

        if(this.lastDirection == 1) // 横向
        {

            for(var i = 0; i < this.hGems.length; i++)
            {
                gem = this.hGems[i];
                gem.x = i;

                var pos = cc.p(gem.getPosition().x + dx, gem.getPosition().y);

                gem.setPosition(pos);
            }

            var gem = this.hGems[0];
            if(gem == undefined)
            {
                this.checkMoveBoard();
                return;
            }
            var fpos = gem.getPosition();
            if(fpos.x > 0.5 * kGemSize)
            {
                var lastGem = this.hGems.pop();
                lastGem.x = 0;
                var spos = lastGem.getPosition();
                lastGem.setPosition(cc.p(spos.x - kGemSize * kBoardWidth, spos.y));
                this.hGems.unshift(lastGem);
                needCheck = true;
            }
            else if(fpos.x <= -0.5 * kGemSize)
            {
                var firstGem = this.hGems.shift();
                firstGem.x = kBoardWidth - 1;
                var spos = firstGem.getPosition();
                firstGem.setPosition(cc.p(spos.x + kGemSize * kBoardWidth, spos.y));
                this.hGems.push(firstGem);
                needCheck = true;
            }

            for(var i = 0; i < this.hGems.length; i++)
            {
                gem = this.hGems[i];
                gem.x = i;
                this.board[gem.x + gem.y * kBoardWidth] = gem.gemType;
                this.boardSprites[gem.x + gem.y * kBoardWidth] = gem;
            }

            var fposx = this.hGems[0].getPosition().x;
            if(fposx > 0)
            {
                var lastGem = this.hGems[kBoardWidth - 1];
                this.setCompementType(lastGem.gemType);
                var lpos = lastGem.getPosition();
                lpos.x -= kBoardWidth * kGemSize;
                this.complementGem.setPosition(lpos);
                this.complementGem.setVisible(true);
            }
            else if(fposx < 0)
            {
                var firstGem = this.hGems[0];
                this.setCompementType(firstGem.gemType);
                var lpos = firstGem.getPosition();
                lpos.x += kBoardWidth * kGemSize;
                this.complementGem.setPosition(lpos);
                this.complementGem.setVisible(true);
            }
            else
            {
                this.complementGem.setVisible(false);
            }
        }
        else
        {

            for(var i = 0; i < this.vGems.length; i++)
            {
                gem = this.vGems[i];
                gem.y = i;

                var pos = cc.p(gem.getPosition().x, gem.getPosition().y + dy);

                gem.setPosition(pos);
            }

            var gem = this.vGems[0];
            if(gem == undefined)
            {
                this.checkMoveBoard();
                return;
            }
            var fpos = gem.getPosition();
            if(fpos.y > 0.5 * kGemSize)
            {
                var lastGem = this.vGems.pop();
                lastGem.y = 0;
                var spos = lastGem.getPosition();
                lastGem.setPosition(cc.p(spos.x, spos.y - kGemSize * kBoardHeight));
                this.vGems.unshift(lastGem);
                needCheck = true;
            }
            else if(fpos.y <= -0.5 * kGemSize)
            {
                var firstGem = this.vGems.shift();
                firstGem.y = kBoardHeight - 1;
                var spos = firstGem.getPosition();
                firstGem.setPosition(cc.p(spos.x, spos.y + kGemSize * kBoardHeight));
                this.vGems.push(firstGem);
                needCheck = true;
            }

            for(var i = 0; i < this.vGems.length; i++)
            {
                gem = this.vGems[i];
                gem.y = i;
                this.board[gem.x + gem.y * kBoardWidth] = gem.gemType;
                this.boardSprites[gem.x + gem.y * kBoardWidth] = gem;
            }

            var fposy = this.vGems[0].getPosition().y;
            if(fposy > 0)
            {
                var lastGem = this.vGems[this.vGems.length - 1];
                this.setCompementType(lastGem.gemType);
                var lpos = lastGem.getPosition();
                lpos.y -= kBoardHeight * kGemSize;
                this.complementGem.setPosition(lpos);
                this.complementGem.setVisible(true);
            }
            else if(fposy < 0)
            {
                var firstGem = this.vGems[0];
                this.setCompementType(firstGem.gemType);
                var lpos = firstGem.getPosition();
                lpos.y += kBoardHeight * kGemSize;
                this.complementGem.setPosition(lpos);
                this.complementGem.setVisible(true);
            }
            else
            {
                this.complementGem.setVisible(false);
            }
        }

        this.vMarker.setPosition(cc.p(gSelectGem.x * kGemSize, -kGemSize / 2));
        this.hMarker.setPosition(cc.p(-kGemSize / 2, gSelectGem.y * kGemSize));

        if(needCheck)
        {
            this.checkMoveBoard();
        }
    },


    onTouchesEnded : function(touches, event)
    {
        if(gCurState < kStateTouchDown || gCurState > kStateTouchEnd)
            return;
        this.changeState(kStateTouchEnd);
    },

    touchEnded : function()
    {
        this.sockHGems();
        this.sockVGems();
    },

    unlockTen : function()
    {
        this.hMarker.setVisible(false);
        this.vMarker.setVisible(false);

        if(gSelectGem != undefined && gSelectGem != null)
        {
            gSelectGem.stopAllActions();
            gSelectGem.setRotation(0);
        }

        this.changeState(kStateRemoveGems);
    },
    onUpdate : function(dt)
    {
        if (!this.isGameOver)
        {
            if(this.waitFrames > -1 && this.waitFrames-- == 0)
            {
                this.changeState(kStateRemoveGems);
                this.waitFrames = -1;
                return;
            }

            var gemLanded = false;

            var numFallingGems = this.fallingGems.length;
            if(numFallingGems <= 0 && gCurState == kStateDropGems)
            {
                this.nextState();
            }
            for (var i = numFallingGems-1; i >= 0; i--)
            {
                var gem = this.fallingGems[i];

                gem.ySpeed += 0.02;
                gem.ySpeed *= 0.98;
                gem.yPos -= gem.ySpeed;

                if (gem.yPos <= gem.y)
                {
                    // The gem hit the ground or a fixed gem
                    if (!gemLanded)
                    {
                        gAudioEngine.playEffect("sounds/tap-"+Math.floor(Math.random()*4)+".caf");
                        gemLanded = true;
                    }

                    this.fallingGems.splice(i, 1);

                    this.board[gem.x + gem.y*kBoardWidth] = gem.gemType;
                    this.boardSprites[gem.x + gem.y*kBoardWidth] = gem;
                    // Update fixed position
                    gem.setPosition(cc.p(gem.x*kGemSize, gem.y*kGemSize));
                }
                else
                {
                    // Update the falling gems position
                    gem.setPosition(cc.p(gem.x*kGemSize, gem.yPos*kGemSize));
                }
            }


            // Update timer
            var d = new Date();
            var currentTime = d.getTime();
            var elapsedTime = (currentTime - this.startTime)/kTotalGameTime;
            var timeLeft = (1 - elapsedTime)*100;
            if (timeLeft < 0) timeLeft = 0;
            if (timeLeft > 99.9) timeLeft = 99.9;

            this.timer.setPercentage(timeLeft);

//            if (currentTime - gLastMoveTime > kMaxTimeBetweenConsecutiveMoves)
//            {
//                gNumConsecutiveGems = 0;
//            }
//
//            // Check if timer sound should be played
//            if (timeLeft < 6.6 && !gEndTimerStarted)
//            {
//                gAudioEngine.playEffect("sounds/timer.caf");
//                gEndTimerStarted = true;
//            }

            // Check for game over
            if (timeLeft == 0)
            {
//			createGameOver();
                this.rootNode.animationManager.runAnimationsForSequenceNamed("Outro");
                this.isGameOver = true;
                gAudioEngine.playEffect("sounds/endgame.caf");
                gLastScore = this.score;
            }
        }
        else
        {
//		updateGameOver();
        }
    } ,

    onAnimationComplete : function()
    {
        if (this.isGameOver)
        {
            var scene = cc.BuilderReader.loadAsScene("MainScene.ccbi");
            cc.Director.getInstance().replaceScene(scene);
        }
    },

    onPauseClicked : function(dt)
    {
//	createGameOver();
        this.rootNode.animationManager.runAnimationsForSequenceNamed("Outro");
        this.isGameOver = true;
        //gAudioEngine.stopAllEffects();
        cc.log("stopAllEffects not working!");
        gAudioEngine.playEffect("sounds/endgame.caf");
    },


    removeShimmer : function()
    {
        var children = this.shimmerLayer.getChildren();
        for (var i = 0; i < children.length; i++)
        {
            children[i].runAction(cc.FadeOut.create(1));
        }
    },

    setupShimmer : function()
    {
        cc.SpriteFrameCache.getInstance().addSpriteFrames("gamescene/shimmer.plist");

        for (var i = 0; i < 2; i++)
        {
            var sprt = cc.Sprite.createWithSpriteFrameName("gamescene/shimmer/bg-shimmer-"+i+".png");

            var seqRot = null;
            var seqMov = null;
            var seqSca = null;

            for (var j = 0; j < 10; j++)
            {
                var time = Math.random()*10+5;
                var x = kBoardWidth*kGemSize/2;
                var y = Math.random()*kBoardHeight*kGemSize;
                var rot = Math.random()*180-90;
                var scale = Math.random()*3 + 3;

                var actionRot = cc.EaseInOut.create(cc.RotateTo.create(time, rot), 2);
                var actionMov = cc.EaseInOut.create(cc.MoveTo.create(time, cc.p(x,y)), 2);
                var actionSca = cc.ScaleTo.create(time, scale);

                if (!seqRot)
                {
                    seqRot = actionRot;
                    seqMov = actionMov;
                    seqSca = actionSca;
                }
                else
                {
                    seqRot = cc.Sequence.create(seqRot, actionRot);
                    seqMov = cc.Sequence.create(seqMov, actionMov);
                    seqSca = cc.Sequence.create(seqSca, actionSca);
                }
            }

            var x = kBoardWidth*kGemSize/2;
            var y = Math.random()*kBoardHeight*kGemSize;
            var rot = Math.random()*180-90;

            sprt.setPosition(cc.p(x,y));
            sprt.setRotation(rot);

            sprt.setPosition(cc.p(kBoardWidth*kGemSize/2, kBoardHeight*kGemSize/2));
            sprt.setBlendFunc(gl.SRC_ALPHA, gl.ONE);
            sprt.setScale(3);

            this.shimmerLayer.addChild(sprt);
            sprt.setOpacity(0);
            sprt.runAction(cc.RepeatForever.create(seqRot));
            sprt.runAction(cc.RepeatForever.create(seqMov));
            sprt.runAction(cc.RepeatForever.create(seqSca));

            sprt.runAction(cc.FadeIn.create(2));
        }
    } ,

    updateSparkle : function()
    {
        if (Math.random() > 0.1) return;
        var idx = Math.floor(Math.random()*kNumTotalGems);
        var gemSprite = this.boardSprites[idx];
        if (this.board[idx] < 0 || this.board[idx] >= 5) return;
        if (!gemSprite) return;

        if (gemSprite.getChildren().length > 0) return;

        sprite = cc.Sprite.createWithSpriteFrameName("crystals/sparkle.png");
        sprite.runAction(cc.RepeatForever.create(cc.RotateBy.create(3, 360)));

        sprite.setOpacity(0);

        sprite.runAction(cc.Sequence.create(
            cc.FadeIn.create(0.5),
            cc.FadeOut.create(2),
            cc.CallFunc.create(onRemoveFromParent, this)));

        sprite.setPosition(cc.p(kGemSize*(2/6), kGemSize*(4/6)));

        gemSprite.addChild(sprite);
    },

    onRemoveFromParent : function(node, value)
    {
        node.getParent().removeChild(node, true);
    },

    addScore : function(score)
    {
        this.score += score;
        this.scoreLabel.setString(""+this.score);
    },

    inforScore : function(score)
    {
        this.infoScoreLabel.setString("you will get " + score);
    },

    setCompementType : function(t)
    {
        this.complementGem.setDisplayFrame(cc.SpriteFrameCache.getInstance().getSpriteFrame("crystals/"+t+".png"));
    },

    sockHGems : function()
    {
        if(this.hGems.length <= 0)
            return;
        var gem = this.hGems[0];
        var fpos = gem.getPosition();
        if(fpos.x > 0.5 * kGemSize)
        {
            var lastGem = this.hGems.pop();
            lastGem.x = 0;
            var spos = lastGem.getPosition();
            lastGem.setPosition(cc.p(spos.x - kGemSize * kBoardWidth, spos.y));
            this.hGems.unshift(lastGem);
        }
        else if(fpos.x <= -0.5 * kGemSize)
        {
            var firstGem = this.hGems.shift();
            firstGem.x = kBoardWidth - 1;
            var spos = firstGem.getPosition();
            firstGem.setPosition(cc.p(spos.x + kGemSize * kBoardWidth, spos.y));
            this.hGems.push(firstGem);
        }

        this.complementGem.setVisible(false);

        for(var i = 0; i < this.hGems.length; i++)
        {
            gem = this.hGems[i];
            gem.x = i;
            var pos = gem.getPosition();
            gem.setPosition(cc.p(kGemSize * i, pos.y));
            this.board[gem.x + gem.y * kBoardWidth] = gem.gemType;
            this.boardSprites[gem.x + gem.y * kBoardWidth] = gem;
        }

        this.hGems.splice(0, this.hGems.length);
    },

    sockVGems : function()
    {
        if(this.vGems.length <= 0)
            return;
        var gem = this.vGems[0];
        var fpos = gem.getPosition();
        if(fpos.y > 0.5 * kGemSize)
        {
            var lastGem = this.vGems.pop();
            lastGem.y = 0;
            var spos = lastGem.getPosition();
            lastGem.setPosition(cc.p(spos.x, spos.y - kGemSize * kBoardHeight));
            this.vGems.unshift(lastGem);
        }
        else if(fpos.y <= -0.5 * kGemSize)
        {
            var firstGem = this.vGems.shift();
            firstGem.y = kBoardHeight - 1;
            var spos = firstGem.getPosition();
            firstGem.setPosition(cc.p(spos.x, spos.y + kGemSize * kBoardHeight));
            this.vGems.push(firstGem);
        }

        this.complementGem.setVisible(false);

        for(var i = 0; i < this.vGems.length; i++)
        {
            gem = this.vGems[i];
            gem.y = i;
            var pos = gem.getPosition();
            gem.setPosition(cc.p(pos.x, i * kGemSize));
            this.board[gem.x + gem.y * kBoardWidth] = gem.gemType;
            this.boardSprites[gem.x + gem.y * kBoardWidth] = gem;
        }

        this.vGems.splice(0, this.vGems.length);
    },

    checkMoveBoard : function(flag)
    {
        if(flag == undefined || !flag)
        {
            var num = this.connectedGems.length;
            for(var i = num - 1; i >= 0 ; i--)
            {
                this.connectedGems[i].highLight(false);
            }
        }
        this.findAllConnectedGems();

        this.inforScore(caculateScore(this.connectedGems.length));
    },

    removeMarkedGems : function()
    {
        // Iterate through the board
        for (var x = 0; x < kBoardWidth; x++)
        {
            var dy = 0;
            var lastNull = false;
            for (var y = 0; y < kBoardHeight; y++)
            {
                var i = x + y * kBoardWidth;

                if(this.board[i] < 0)
                {
                    dy += this.board[i];
                    lastNull = true;
                }
                else
                {
                    if(lastNull)
                    {
                        this.fallingGems.push(this.boardSprites[i]);
                    }
                    this.boardSprites[i].y += dy;
                    this.boardSprites[i].ySpeed = 0;
                }
            }

            if(dy < 0)
            {
                for(var y = kBoardHeight + dy; y < kBoardHeight; y++)
                {
                    var i = x + y * kBoardWidth;

                    var gemType = genType(this.board[i = x + (y - 1) * kBoardWidth], this.board[i = x - 1 + (y) * kBoardWidth], this.board[i = x + 1 + (y) * kBoardWidth]);

                    var gem = GridSprite.createWithType(gemType);
                    gem.yPos = kBoardHeight;
                    gem.ySpeed = 0;
                    gem.setGrid(x, y);
                    this.fallingGems.push(gem);
                    this.gemLayer.addChild(gem);
                    gem.setPosition(cc.p(x * kGemSize, kBoardHeight * kGemSize));
                    gem.setAnchorPoint(cc.p(0.5, 0.5));
                }
            }
        }
    } ,

    findConnectedGems_ : function(x, y, arr, gemType, xDirection, yDirection)
    {
        // Check for bounds
        xDirection = xDirection && true;
        yDirection = yDirection && true;

        if (x < 0 || x >= kBoardWidth) return;
        if (y < 0 || y >= kBoardHeight) return;

        var idx = x + y*kBoardWidth;

        // Make sure that the gems type match
        if (this.board[idx] != gemType) return;


        // Check if idx is already visited
        if(arr.indexOf(idx) >= 0) return;

        // Add idx to array
        arr.push(idx);

        // Visit neighbours
        if(xDirection)
        {
            this.findConnectedGems_(x+1, y, arr, gemType, true, false);
            this.findConnectedGems_(x-1, y, arr, gemType, true, false);
        }

        if(yDirection)
        {
            this.findConnectedGems_(x, y+1, arr, gemType, false, true);
            this.findConnectedGems_(x, y-1, arr, gemType, false, true);
        }
    },
    findAllConnectedGems : function()
    {
        this.connectedGems.splice(0, this.connectedGems.length);
        for(var x = 0; x < kBoardWidth; x++)
        {
            for(var y = 0; y < kBoardHeight; y++)
            {
                var connected = new Array();
                if(this.board[x + y * kBoardWidth] <= -1) continue;
                this.findConnectedGems_(x, y, connected, this.board[x + y*kBoardWidth], true, true);
                if(connected.length >= 3)
                {
                    for(var i = 0; i < connected.length; i++)
                    {
                        var gem = this.boardSprites[connected[i]];

                        if(this.connectedGems.indexOf(gem) < 0)
                        {
                            this.connectedGems.push(gem);
                            gem.highLight(true);
                        }
                    }
                }
            }
        }
    },

    setupBoard : function()
    {
        this.board = new Array(kNumTotalGems);


        // 先生成前两个
        this.board[0] = (genType());
        this.board[1] = (genType());

        // 再生成第一排的剩余几个, 只要前两个颜色不一样,当前随机给,反之取与前者不一样的颜色
        for(var x = 2; x < kBoardWidth; x++)
        {
            if(this.board[x - 1] == this.board[x - 2])
            {
                this.board[x] = (genType(this.board[x - 1]));
            }
            else
            {
                this.board[x] = (genType());
            }
        }

        var typex;
        var typey;
        var idx;
        var idy;
        var connected;

        // 如果x,y方向的上一个是一样的颜色不能取与之相同的
        // 依次去找x,y方向的前一个有无超过两个相连的, 如果有取与它们颜色不一样的
        for(var y = 1; y < kBoardHeight; y++)
        {
            for(var x = 0; x < kBoardWidth; x++)
            {
                typex = typey = -1;
                idy = x + (y - 1) * kBoardWidth;
                typey = this.board[idy]

                if(typey == this.board[x - 1 + y * kBoardWidth])
                {
                    this.board[x + y * kBoardWidth] = genType(typey);
                    continue;
                }

                connected = new Array();

                this.findConnectedGems_(x, y - 1, connected, typey, true, true);
                if(connected.length < 2)
                {
                    typey = -1;
                }

                if(x > 0)
                {
                    idx = x - 1 + y * kBoardWidth;
                    typex = this.board[idx]
                    connected = new Array();

                    this.findConnectedGems_(x - 1, y, connected, typex, true, true);
                    if(connected.length < 2)
                    {
                        typex = -1;
                    }
                }

                this.board[x + y * kBoardWidth] = genType(typex, typey);
            }
        }

        for(var y = kBoardHeight - 1; y >= 0; y--)
        {
            var str = "";
            for (var x = 0; x < kBoardWidth; x++)
            {
                str = str + this.board[x + y * kBoardWidth] + ", ";
            }
            cc.log(str);
        }
    },

    removeGems : function()
    {
        var connected = this.connectedGems;
        var removedGems = false;

        if (connected.length >= 3)
        {
            removedGems = true;

            this.addScore(caculateScore(connected.length));

            for (var i = 0; i < connected.length; i++)
            {
                var gem = connected[i];
                var idx = gem.x + gem.y * kBoardWidth;
                var gemX = gem.x;
                var gemY = gem.y;
                
                var type = this.board[idx];
                var plz = "particles/tagken-0" + type + ".plist"
               	if(type >= kNumTypes || type < 0)
               	{
               		plz = "particles/taken-gem.plist";
               	}

                this.board[idx] = -1;
                GridSprite.recoveSprite(this.boardSprites[idx]);
                this.boardSprites[idx] = null;

				 var h = kGemSize * (kBoardHeight + 3);
//             Add particle effect
                var particle = cc.ParticleSystem.create(plz);
                particle.setPosition(gemX * kGemSize+kGemSize/2, gemY*kGemSize+kGemSize/2);
                particle.setAutoRemoveOnFinish(true);
                this.particleLayer.addChild(particle);
                var s = cc.Director.getInstance().getWinSize();

                var ac = cc.MoveTo.create(0.9, cc.p(s.width * type / (kNumTypes) + kGemSize / 2,  h));
//                var ac = cc.BezierTo.create(0.4, [cc.p(-160, 350), cc.p(160, -350), cc.p(160, 350)]);
                particle.runAction(ac);
            }
            this.nextState();
        }
        else
        {
            gAudioEngine.playEffect("sounds/miss.caf");
            this.changeState(kStateIdle);
        }
        
        return removedGems;
    },

    checkBoard : function()
    {
        this.checkMoveBoard();

        if(this.connectedGems.length > 0)
        {
            this.waitFrames = 3;
        }
        else
        {
            this.changeState(kStateIdle);
        }
    },

    initStateMachines : function()
    {
        gStateMachines = new Array(0);
        gStateMachines.push(
            null,               // kStateIdle
            null,
            null,
            null,
            "touchEnded",
            "removeGems",
            "removeMarkedGems",
            "checkBoard"
        );
    },

    executeState : function()
    {
        var fun = gStateMachines[gCurState];
        if(typeof (this[fun]) == "function")
        {
            this[fun]();
        }

    },

    nextState : function()
    {
        gCurState++;
        if(gCurState >= kStateLength)
        {
            gCurState = kStateIdle;
        }

        this.executeState();
    },

    changeState : function(state)
    {
        if(state >= 0 && state < kStateLength)
        {
            gCurState = state;
            this.executeState();
        }
    }
});