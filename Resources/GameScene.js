var kTotalGameTime = 1000*1000;
var kIntroTime = 1800;
var kNumRemovalFrames = 8;
var kTimeBetweenGemAdds = 8;

var kMaxTimeBetweenConsecutiveMoves = 1000;


var gFallingGems;
var gNumGemsInColumn;
var gBoard;
var gBoardSprites;
var gTimeSinceAddInColumn;

var gNumConsecutiveGems;
var gIsPowerPlay;


var gGameLayer;
var gParticleLayer;

var gShimmerLayer;
var gEffectsLayer;

var gTimer;

var gStartTime;
var gLastMoveTime;

var gBoardChangedSinceEvaluation;

var gIsGameOver;
var gScoreLabel;
var gEndTimerStarted;

var gHMarker;
var gVMarker;
var gTmpSp;
var gLastPos;
var gLastDirection;
var gConnectted;
var gGameInit;
var gInfoLabel;
var gLockSprite;

function setupShimmer()
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

		gShimmerLayer.addChild(sprt);
		sprt.setOpacity(0);
		sprt.runAction(cc.RepeatForever.create(seqRot));
		sprt.runAction(cc.RepeatForever.create(seqMov));
		sprt.runAction(cc.RepeatForever.create(seqSca));

		sprt.runAction(cc.FadeIn.create(2));
	}
}

function removeShimmer()
{
	var children = gShimmerLayer.getChildren();
	for (var i = 0; i < children.length; i++)
	{
		children[i].runAction(cc.FadeOut.create(1));
	}
}

function updateSparkle()
{
	if (Math.random() > 0.1) return;
	var idx = Math.floor(Math.random()*kNumTotalGems);
	var gemSprite = gBoardSprites[idx];
	if (gBoard[idx] < 0 || gBoard[idx] >= 5) return;
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
}

function onRemoveFromParent(node, value)
{
	node.getParent().removeChild(node, true);
}


function addScore(score)
{
	gScore += score;
	gScoreLabel.setString(""+gScore);
}

function inforScore(score)
{
	gInfoLabel.setString("you will get " + score);
}

function setTmpType(t)
{
    gTmpSp.setDisplayFrame(cc.SpriteFrameCache.getInstance().getSpriteFrame("crystals/"+t+".png"));
}

function sockHGems(needSplice)
{
    needSplice = needSplice || false;
    if(gHGmes.length <= 0)
	return;
    var gem = gHGmes[0];
    var fpos = gem.getPosition();
    if(fpos.x > 0.5 * kGemSize)
    {
	var lastGem = gHGmes.pop();
	lastGem.x = 0;
	var spos = lastGem.getPosition();
	lastGem.setPosition(cc.p(spos.x - kGemSize * kBoardWidth, spos.y));
	gHGmes.unshift(lastGem);
    }
    else if(fpos.x <= -0.5 * kGemSize)
    {
	var firstGem = gHGmes.shift();
	firstGem.x = kBoardWidth - 1;
	var spos = firstGem.getPosition();
	firstGem.setPosition(cc.p(spos.x + kGemSize * kBoardWidth, spos.y));
	gHGmes.push(firstGem);
    }

    gTmpSp.setVisible(false);

    for(var i = 0; i < gHGmes.length; i++)
    {
	gem = gHGmes[i];
	gem.x = i;
	var pos = gem.getPosition();
	gem.setPosition(cc.p(kGemSize * i, pos.y));
	gBoard[gem.x + gem.y * kBoardWidth] = gem.gemType;
	gBoardSprites[gem.x + gem.y * kBoardWidth] = gem;
    }

    if(!needSplice)
        gHGmes.splice(0, gHGmes.length);
}

function sockVGems(needSplice)
{
    needSplice = needSplice || false;
    if(gVGems.length <= 0)
	return;
    var gem = gVGems[0];
    var fpos = gem.getPosition();
    if(fpos.y > 0.5 * kGemSize)
    {
	var lastGem = gVGems.pop();
	lastGem.y = 0;
	var spos = lastGem.getPosition();
	lastGem.setPosition(cc.p(spos.x, spos.y - kGemSize * kBoardHeight));
	gVGems.unshift(lastGem);
    }
    else if(fpos.y <= -0.5 * kGemSize)
    {
	var firstGem = gVGems.shift();
	firstGem.y = kBoardHeight - 1;
	var spos = firstGem.getPosition();
	firstGem.setPosition(cc.p(spos.x, spos.y + kGemSize * kBoardHeight));
	gVGems.push(firstGem);
    }

    gTmpSp.setVisible(false);

    for(var i = 0; i < gVGems.length; i++)
    {
	gem = gVGems[i];
	gem.y = i;
	var pos = gem.getPosition();
	gem.setPosition(cc.p(pos.x, i * kGemSize));
	gBoard[gem.x + gem.y * kBoardWidth] = gem.gemType;
	gBoardSprites[gem.x + gem.y * kBoardWidth] = gem;
    }
    if(!needSplice)
        gVGems.splice(0, gVGems.length)
}


function checkMoveBoard(func, x, flag)
{
    if(flag == undefined || !flag)
    {
	var num = gConnectted.length;
	for(var i = num - 1; i >= 0 ; i--)
	{
	    gConnectted[i].highLight(false);
	}
    }
    func(x);
    
    inforScore(caculateScore(gConnectted.length));
}

function removeMarkedGems()
{
    // Iterate through the board
    for (var x = 0; x < kBoardWidth; x++)
    {
	var dy = 0;
	var lastNull = false;
	for (var y = 0; y < kBoardHeight; y++)
	{
	    var i = x + y * kBoardWidth;
	    
	    if(gBoard[i] < 0)
	    {
		dy += gBoard[i];
		lastNull = true;
	    }
	    else
	    {
		if(lastNull)
		{
		    gFallingGems.push(gBoardSprites[i]);
		}
		gBoardSprites[i].y += dy;
		gBoardSprites[i].ySpeed = 0;
	    }
	}

	if(dy < 0)
	{
	    for(var y = kBoardHeight + dy; y < kBoardHeight; y++)
	    {
		var i = x + y * kBoardWidth;

		var gemType = genType(gBoard[i = x + (y - 1) * kBoardWidth], gBoard[i = x - 1 + (y) * kBoardWidth], gBoard[i = x + 1 + (y) * kBoardWidth]);

		var gem = GridSprite.createWithType(gemType);
		gem.yPos = kBoardHeight;
		gem.ySpeed = 0;
		gem.setGrid(x, y);
		gFallingGems.push(gem);
		gGameLayer.addChild(gem);
		gem.setPosition(cc.p(x * kGemSize, kBoardHeight * kGemSize));
		gem.setAnchorPoint(cc.p(0.5, 0.5));
	    }
	}
    }
}

//
// MainScene class
//
var GameScene = function(){};

GameScene.prototype.onDidLoadFromCCB = function()
{
    var w = cc.Director.getInstance().getWinSize().width;
    if(w > kBoardWidth * kGemSize)
    {
	kGemSize *= 2;
    }
	// Setup board
	setupBoard();

    gGameInit = false;
    

    gConnectted = new Array(0);

    // Setup timer
    this.sprtTimer.setVisible(false);
    gTimer = cc.ProgressTimer.create(cc.Sprite.create("gamescene/timer.png"));
    gTimer.setPosition(this.sprtTimer.getPosition());
    gTimer.setPercentage(100);
    gTimer.setType(cc.PROGRESS_TIMER_TYPE_BAR);
    gTimer.setMidpoint(cc.p(0, 0.5));
    gTimer.setBarChangeRate(cc.p(1, 0));
    this.sprtHeader.addChild(gTimer);

    var d = new Date();
    gStartTime = d.getTime() + kIntroTime;
    gLastMoveTime = d.getTime();
    gNumConsecutiveGems = 0;
    gIsPowerPlay = false;
    gEndTimerStarted = false;

    gScore = 0;

    // Schedule callback
    this.rootNode.onUpdate = function(dt) {
	this.controller.onUpdate();
    };
    this.rootNode.schedule(this.rootNode.onUpdate);

    // TODO: Make into batch node
    
    if ("opengl" in sys.capabilities) 
    {
	cc.log("On mobile");
	gParticleLayer = cc.ParticleBatchNode.create("particles/taken-gem.png", 250);
	gGameLayer = cc.SpriteBatchNode.create("crystals.png");
    }
    else
    {
	cc.log("On web");
	gParticleLayer = cc.Node.create();
	gGameLayer = cc.Node.create();
    }
    
    gIsGameOver = false;

    gGameLayer.setContentSize(this.gameLayer.getContentSize());
    gGameLayer.setPosition(cc.p(kGemSize * 0.5, kGemSize * 0.5));
    gShimmerLayer = cc.Node.create();
    gEffectsLayer = cc.Node.create();

    this.gameLayer.addChild(gShimmerLayer, -1);
    this.gameLayer.addChild(gParticleLayer, 1);
    this.gameLayer.addChild(gGameLayer, 0);
    this.gameLayer.addChild(gEffectsLayer, 2);
    
    gInfoLabel = cc.LabelTTF.create("1234567890ASDFGHJKSDLF", "Arial", 24);
    var size = cc.Director.getInstance().getWinSize();
    gInfoLabel.setPosition(cc.p(size.width / 2, size.height - 100));
    this.gameLayer.addChild(gInfoLabel);

    var width = kBoardWidth * kGemSize;
    var height = kBoardHeight * kGemSize;

    gVMarker = cc.Sprite.createWithSpriteFrameName("crystals/vmarker.png");
    gHMarker = cc.Sprite.createWithSpriteFrameName("crystals/hmarker.png");

    var size = gVMarker.getContentSize();
    gHMarker.setScaleX(width / size.width);
    gVMarker.setScaleY(height / size.height);

    gVMarker.setAnchorPoint(cc.p(0.5, 0));
    gVMarker.setPosition(cc.p(0, -kGemSize / 2));
    gHMarker.setAnchorPoint(cc.p(0, 0.5));
    gHMarker.setPosition(cc.p(-kGemSize / 2, 0));

    gHMarker.setVisible(false);
    gVMarker.setVisible(false);

    gGameLayer.addChild(gHMarker, -1);
    gGameLayer.addChild(gVMarker, -1);


	this.rootNode.animationManager.setCompletedAnimationCallback(this, this.onAnimationComplete);

	setupShimmer();

	gScoreLabel = this.lblScore;

    initStateMachines();
    changeState(kStateIdle);

    gTmpSp = cc.Sprite.createWithSpriteFrameName("crystals/0.png");
    gTmpSp.setAnchorPoint(cc.p(0.5, 0.5));
    gGameLayer.addChild(gTmpSp);
    gTmpSp.setVisible(false);
    var y = 0;

    this.rootNode.schedule(function(dt)
    {
	for(var x = 0; x < kBoardWidth; x++)
	{
	    var idx = x + y * kBoardWidth;
	    var gemType = gBoard[idx];
	    var gem = GridSprite.createWithType(gemType);
	    gem.setPosition(cc.p(x * kGemSize, kBoardHeight * kGemSize));
	    gem.setAnchorPoint(cc.p(0.5, 0.5));
	    gem.yPos = kBoardHeight;
	    gem.ySpeed = 0;
	    gem.setGrid(x, y);
	    gFallingGems.push(gem);
	    gGameLayer.addChild(gem);
	}
	y++;

	if(y >= kBoardHeight)
	{
	    gGameInit = true;
	}
    }, 0.1, kBoardHeight - 1);

    gHGmes = new Array();
    gVGems = new Array();

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


    gLockSprite = GridSprite.createWithType(5);
    gLockSprite.inLock = false;
    gLockSprite.setAnchorPoint(cc.p(0.5, 0.5));
    gLockSprite.setGrid(kBoardWidth - 1, kBoardHeight + 2);
    gLockSprite.setPosition(cc.p(kGemSize * (kBoardWidth - 1), kGemSize * (kBoardHeight + 2)));
    gGameLayer.addChild(gLockSprite);
};

GameScene.prototype.onTouchesBegan = function(touches, event)
{
    cc.log("Touch began, state : " + gCurState);
    if(gCurState > kStateTouchEnd || gIsGameOver)
	    return;

    changeState(kStateTouchDown);

    gLastDirection = 0;// 没有方向
	var loc = touches[0].getLocation();

	loc = cc.pSub(loc, this.gameLayer.getPosition());
    gLastPos = loc;

	var x = Math.floor(loc.x/kGemSize);
	var y = Math.floor(loc.y/kGemSize);

    if(x == gLockSprite.x && y == gLockSprite.y && gLockSprite.inLock == true)
    {
        gLockSprite.inLock = false;

        gLockSprite.highLight(false);
        changeState(kStateTouchEnd);
        this.unlockTen();
        return;
    }

    if(gLockSprite.inLock == true)
    {
        var x = gSelectGem.x;
        var y = gSelectGem.y;
        gHGmes.splice(0, gHGmes.length);
        gVGems.splice(0, gVGems.length);

        for(var i = 0; i < kBoardWidth; i++)
        {
            gemSprite = gBoardSprites[i + y * kBoardWidth];
            if(i == x)
                gHGmes.push(gSelectGem);
            else
                gHGmes.push(gemSprite);
        }

        for(var j = 0; j < kBoardHeight; j++)
        {
            gemSprite = gBoardSprites[x + j * kBoardWidth];
            if(j == y)
                gVGems.push(gSelectGem);
            else
                gVGems.push(gemSprite);
        }

        gLockSprite.setGemType(gSelectGem.gemType);
        gLockSprite.highLight(true);
        gLockSprite.inLock = true;
        cc.log("In Lock");
        return;
    }

    if(x >= kBoardWidth || y >= kBoardHeight)
        return;

    var idx = x + y * kBoardWidth;

    var gemType = gBoard[idx];
    var gemSprite = gBoardSprites[idx];
//    gemSprite.setScale(1.2);
    var ac = cc.RotateBy.create(0.2, 30);
    gemSprite.runAction(cc.RepeatForever.create(ac));
    gSelectGem = gemSprite;

    gVMarker.setVisible(true);
    gHMarker.setVisible(true);
    gVMarker.setPosition(cc.p(x * kGemSize, -kGemSize / 2));
    gHMarker.setPosition(cc.p(-kGemSize / 2, y * kGemSize));


    gHGmes.splice(0, kBoardWidth);
    gVGems.splice(0, kBoardHeight);

    for(var i = 0; i < kBoardWidth; i++)
    {
	gemSprite = gBoardSprites[i + y * kBoardWidth];
	if(i == x)
	    gHGmes.push(gSelectGem);
	else
	    gHGmes.push(gemSprite);
    }

    for(var j = 0; j < kBoardHeight; j++)
    {
	gemSprite = gBoardSprites[x + j * kBoardWidth];
	if(j == y)
	    gVGems.push(gSelectGem);
	else
	    gVGems.push(gemSprite);
    }

    gLockSprite.setGemType(gSelectGem.gemType);
    gLockSprite.highLight(true);
    gLockSprite.inLock = true;

    nextState();

	var d = new Date();
	gLastMoveTime = d.getTime();
};

GameScene.prototype.onTouchesMoved = function(touches, event)
{
    cc.log("Touch Moved, state : " + gCurState);
    if(gCurState < kStateTouchDown || gCurState > kStateTouchEnd)
	    return;
    var loc = touches[0].getLocation();

    var needCheckX = -1;
    var needCheckY = -1;

    loc = cc.pSub(loc, this.gameLayer.getPosition());

    var op = gLastPos;
    gLastPos = loc;

    var dx = loc.x - op.x;
    var dy = loc.y - op.y;

    var y = gSelectGem.y;

    if(gLastDirection == 0)
    {
	if(Math.abs(dx) > Math.abs(dy))
	{
	    gLastDirection = 1;
	    gVGems.splice(0, gVGems.length);
	}
	else
	{
	    gLastDirection = 2;
	    gHGmes.splice(0, gHGmes.length);
	}
    }
    else if(gLastDirection == 1)
    {
	if(Math.abs(dy) > 2 * Math.abs(dx))
	{
	    sockHGems();
	    var x = gSelectGem.x;
	    var y = gSelectGem.y;
	    var gemSprite;
	    var gemType;
	    for(var j = 0; j < kBoardHeight; j++)
	    {
		gemSprite = gBoardSprites[x + j * kBoardWidth];
		if(j == y)
		    gVGems.push(gSelectGem);
		else
		    gVGems.push(gemSprite);
	    }

//	    gVMarker.setPosition(cc.p(x * kGemSize, -kGemSize / 2));
	    gLastDirection = 2;
	}
    }
    else if(gLastDirection == 2)
    {
	if(Math.abs(dx) > 2 * Math.abs(dy))
	{
	    sockVGems();
	    var y = gSelectGem.y;
	    var x = gSelectGem.x;
	    var gemSprite;
	    var gemType;
	    for(var i = 0; i < kBoardWidth; i++)
	    {
		gemSprite = gBoardSprites[i + y * kBoardWidth];
		if(i == x)
		    gHGmes.push(gSelectGem);
		else
		    gHGmes.push(gemSprite);
	    }
	    gLastDirection = 1;
	}
    }

    if(gLastDirection == 1) // 横向
    {

	for(var i = 0; i < gHGmes.length; i++)
	{
	    gem = gHGmes[i];
	    gem.x = i;

	    var pos = cc.p(gem.getPosition().x + dx, gem.getPosition().y);

	    gem.setPosition(pos);
	}

	var gem = gHGmes[0];
	if(gem == undefined)
	{
	    checkMoveBoard(findAllConnectedGems);
	    return;
	}
	var fpos = gem.getPosition();
	if(fpos.x > 0.5 * kGemSize)
	{
	    var lastGem = gHGmes.pop();
	    lastGem.x = 0;
	    var spos = lastGem.getPosition();
	    lastGem.setPosition(cc.p(spos.x - kGemSize * kBoardWidth, spos.y));
	    gHGmes.unshift(lastGem);
	    needCheckY = gem.y;
	}
	else if(fpos.x <= -0.5 * kGemSize)
	{
	    var firstGem = gHGmes.shift();
	    firstGem.x = kBoardWidth - 1;
	    var spos = firstGem.getPosition();
	    firstGem.setPosition(cc.p(spos.x + kGemSize * kBoardWidth, spos.y));
	    gHGmes.push(firstGem);
	    needCheckY = gem.y;
	}

	for(var i = 0; i < gHGmes.length; i++)
	{
	    gem = gHGmes[i];
	    gem.x = i;
	    gBoard[gem.x + gem.y * kBoardWidth] = gem.gemType;
	    gBoardSprites[gem.x + gem.y * kBoardWidth] = gem;
	}

	var fposx = gHGmes[0].getPosition().x;
	if(fposx > 0)
	{
	    var lastGem = gHGmes[kBoardWidth - 1];
	    setTmpType(lastGem.gemType);
	    var lpos = lastGem.getPosition();
	    lpos.x -= kBoardWidth * kGemSize;
	    gTmpSp.setPosition(lpos);
	    gTmpSp.setVisible(true);
	}
	else if(fposx < 0)
	{
	    var firstGem = gHGmes[0];
	    setTmpType(firstGem.gemType);
	    var lpos = firstGem.getPosition();
	    lpos.x += kBoardWidth * kGemSize;
	    gTmpSp.setPosition(lpos);
	    gTmpSp.setVisible(true);
	}
	else
	{
	    gTmpSp.setVisible(false);
	}
    }
    else
    {

	for(var i = 0; i < gVGems.length; i++)
	{
	    gem = gVGems[i];
	    gem.y = i;

	    var pos = cc.p(gem.getPosition().x, gem.getPosition().y + dy);

	    gem.setPosition(pos);
	}

	var gem = gVGems[0];
	if(gem == undefined)
	{
	    checkMoveBoard(findAllConnectedGems);
	    return;
	}
	var fpos = gem.getPosition();
	if(fpos.y > 0.5 * kGemSize)
	{
	    var lastGem = gVGems.pop();
	    lastGem.y = 0;
	    var spos = lastGem.getPosition();
	    lastGem.setPosition(cc.p(spos.x, spos.y - kGemSize * kBoardHeight));
	    gVGems.unshift(lastGem);
	    needCheckX = gem.x;
	}
	else if(fpos.y <= -0.5 * kGemSize)
	{
	    var firstGem = gVGems.shift();
	    firstGem.y = kBoardHeight - 1;
	    var spos = firstGem.getPosition();
	    firstGem.setPosition(cc.p(spos.x, spos.y + kGemSize * kBoardHeight));
	    gVGems.push(firstGem);
	    needCheckX = gem.x;
	}

	for(var i = 0; i < gVGems.length; i++)
	{
	    gem = gVGems[i];
	    gem.y = i;
	    gBoard[gem.x + gem.y * kBoardWidth] = gem.gemType;
	    gBoardSprites[gem.x + gem.y * kBoardWidth] = gem;
	}

	var fposy = gVGems[0].getPosition().y;
	if(fposy > 0)
	{
	    var lastGem = gVGems[gVGems.length - 1];
	    setTmpType(lastGem.gemType);
	    var lpos = lastGem.getPosition();
	    lpos.y -= kBoardHeight * kGemSize;
	    gTmpSp.setPosition(lpos);
	    gTmpSp.setVisible(true);
	}
	else if(fposy < 0)
	{
	    var firstGem = gVGems[0];
	    setTmpType(firstGem.gemType);
	    var lpos = firstGem.getPosition();
	    lpos.y += kBoardHeight * kGemSize;
	    gTmpSp.setPosition(lpos);
	    gTmpSp.setVisible(true);
	}
	else
	{
	    gTmpSp.setVisible(false);
	}
    }
    
    gVMarker.setPosition(cc.p(gSelectGem.x * kGemSize, -kGemSize / 2));
    gHMarker.setPosition(cc.p(-kGemSize / 2, gSelectGem.y * kGemSize));

//    if(needCheckX >= 0)
//    {
//	  checkMoveBoard(findRows, needCheckX);
//    }
//    if(needCheckY >= 0)
//    {
//	  checkMoveBoard(findCols, needCheckY);
//    }
    if(needCheckX >= 0 || needCheckY >= 0)
    {
	checkMoveBoard(findAllConnectedGems);
    }
};

GameScene.prototype.onTouchesEnded = function(touches, event)
{
	if(gCurState < kStateTouchDown || gCurState > kStateTouchEnd)
		return;
    sockHGems(true);
    sockVGems(true);

};

GameScene.prototype.unlockTen = function()
{
    gHMarker.setVisible(false);
    gVMarker.setVisible(false);

    if(gSelectGem != undefined && gSelectGem != null)
    {
        gSelectGem.stopAllActions();
        gSelectGem.setRotation(0);
    }

    sockHGems();
    sockVGems();

    changeState(kStateRemoveGems);
}


// Game main loop
GameScene.prototype.onUpdate = function(dt)
{
	if (!gIsGameOver)
    {
    	if(gNeedToRemove > -1 && gNeedToRemove-- == 0)
    	{
    		changeState(kStateRemoveGems);
    		gNeedToRemove = -1;
    		return;
    	}
    	
	var gemLanded = false;
	
	var numFallingGems = gFallingGems.length;
	if(numFallingGems <= 0 && gCurState == kStateDropGems)
	{
	    nextState();
	}
	for (var i = numFallingGems-1; i >= 0; i--)
	{
	    var gem = gFallingGems[i];

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

		gFallingGems.splice(i, 1);
		
		gBoard[gem.x + gem.y*kBoardWidth] = gem.gemType;
		gBoardSprites[gem.x + gem.y*kBoardWidth] = gem;
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
		var elapsedTime = (currentTime - gStartTime)/kTotalGameTime;
		var timeLeft = (1 - elapsedTime)*100;
		if (timeLeft < 0) timeLeft = 0;
		if (timeLeft > 99.9) timeLeft = 99.9;

		gTimer.setPercentage(timeLeft);

		if (currentTime - gLastMoveTime > kMaxTimeBetweenConsecutiveMoves)
		{
			gNumConsecutiveGems = 0;
		}

		// Check if timer sound should be played
		if (timeLeft < 6.6 && !gEndTimerStarted)
		{
			gAudioEngine.playEffect("sounds/timer.caf");
			gEndTimerStarted = true;
		}

		// Check for game over
		if (timeLeft == 0)
		{
//			createGameOver();
			this.rootNode.animationManager.runAnimationsForSequenceNamed("Outro");
			gIsGameOver = true;
			gAudioEngine.playEffect("sounds/endgame.caf");
			gLastScore = gScore;
		}
	}
	else
	{
//		updateGameOver();
	}
};

GameScene.prototype.onAnimationComplete = function()
{
	if (gIsGameOver)
	{
		var scene = cc.BuilderReader.loadAsScene("MainScene.ccbi");
		cc.Director.getInstance().replaceScene(scene);
    }
};

GameScene.prototype.onPauseClicked = function(dt)
{
//	createGameOver();
	this.rootNode.animationManager.runAnimationsForSequenceNamed("Outro");
	gIsGameOver = true;
	//gAudioEngine.stopAllEffects();
	cc.log("stopAllEffects not working!");
	gAudioEngine.playEffect("sounds/endgame.caf");
};
