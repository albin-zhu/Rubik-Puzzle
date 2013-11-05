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

// 全局变量
var gCurState;
var gStateMachines;

var gSelectGem;

var gHGmes;
var gVGems;

var gNeedToRemove = -1;

function touchDown()
{

}

function touchMove()
{

}

function infoConnected()
{

}

function touchEnd()
{

}

function caculateScore(n)
{
     return 5 * n * n;
}

function removeGems()
{
    var connected = gConnectted;
    var removedGems = false;

    if (connected.length >= 3)
    {
        gBoardChangedSinceEvaluation = true;
        removedGems = true;

        addScore(caculateScore(connected.length));

        for (var i = 0; i < connected.length; i++)
        {
            var gem = connected[i];
            var idx = gem.x + gem.y * kBoardWidth;
            var gemX = gem.x;
            var gemY = gem.y;

            gBoard[idx] = -1;
            GridSprite.recoveSprite(gBoardSprites[idx]);
            gBoardSprites[idx] = null;

//             Add particle effect
            var particle = cc.ParticleSystem.create("particles/taken-gem.plist");
            particle.setPosition(gemX * kGemSize+kGemSize/2, gemY*kGemSize+kGemSize/2);
            particle.setAutoRemoveOnFinish(true);
            gParticleLayer.addChild(particle);
            var s = cc.Director.getInstance().getWinSize();

            var ac = cc.MoveTo.create(0.4, cc.p(s.width - 20, s.height - 20));
            var ac = cc.BezierTo.create(0.4, [cc.p(-160, 350), cc.p(160, -350), cc.p(160, 350)]);
            particle.runAction(ac);
        }

        removeMarkedGems();
        nextState();
    }
    else
    {
        gAudioEngine.playEffect("sounds/miss.caf");
        changeState(kStateIdle);
    }

    var d = new Date();
    gLastMoveTime = d.getTime();


    return removedGems;
}

function dropGems()
{

}

function checkBoard()
{
    checkMoveBoard(findAllConnectedGems, 0, true);

    if(gConnectted.length > 0)
    {
    	gNeedToRemove = 3;
    }
    else
    {
        changeState(kStateIdle);
    }
}

function initStateMachines()
{
    gStateMachines = new Array(0);
    gStateMachines.push(
        null,               // kStateIdle
        touchDown,
        touchMove,
        infoConnected,
        touchEnd,
        removeGems,
        dropGems,
        checkBoard
    );
}

function executeState()
{
    var fun = gStateMachines[gCurState];
    if(typeof (fun) == "function")
    {
        fun();
    }

}

function nextState()
{
    gCurState++;
    if(gCurState >= kStateLength)
    {
        gCurState = kStateIdle;
    }

    executeState();
}

function changeState(state)
{
    if(state >= 0 && state < kStateLength)
    {
        gCurState = state;
        executeState();
    }
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

function setupBoard()
{
    gBoard = new Array(kNumTotalGems);
    
//    for(var x = 0; x < kBoardWidth; x++)
//    {
//    	for(var y = 0; y < kBoardHeight; y++)
//    	{
//    		gBoard[x + y * kBoardWidth] = y;
//    	}
//    }
    

    gBoard[0] = (genType());
    gBoard[1] = (genType());

    for(var x = 2; x < kBoardWidth; x++)
    {
         if(gBoard[x - 1] == gBoard[x - 2])
         {
             gBoard[x] = (genType(gBoard[x - 1]));
         }
         else
         {
            gBoard[x] = (genType());
         }
    }

    var typex;
    var typey;
    var idx;
    var idy;
    var connected;

    for(var y = 1; y < kBoardHeight; y++)
    {
        for(var x = 0; x < kBoardWidth; x++)
        {
            typex = typey = -1;
            idy = x + (y - 1) * kBoardWidth;
            typey = gBoard[idy]
            connected = new Array();

            findConnectedGems_(x, y - 1, connected, typey);
            if(connected.length < 2)
            {
                typey = -1;
            }

            if(x > 0)
            {
                idx = x - 1 + y * kBoardWidth;
                typex = gBoard[idx]
                connected = new Array();

                findConnectedGems_(x - 1, y, connected, typex);
                if(connected.length < 2)
                {
                    typex = -1;
                }
            }

            gBoard[x + y * kBoardWidth] = genType(typex, typey);
        }
    }

    for(var y = kBoardHeight - 1; y >= 0; y--)
    {
        var str = "";
        for (var x = 0; x < kBoardWidth; x++)
        {
            str = str + gBoard[x + y * kBoardWidth] + ", ";
        }
        cc.log(str);
    }

    gBoardSprites = new Array(kNumTotalGems);

    gFallingGems = new Array(0);
    
    gSpritePool = new Array(0);

}

function findConnectedGems_(x, y, arr, gemType, xDirection, yDirection)
{
    // Check for bounds
    xDirection = xDirection && true;
    yDirection = yDirection && true;

    if (x < 0 || x >= kBoardWidth) return;
    if (y < 0 || y >= kBoardHeight) return;

    var idx = x + y*kBoardWidth;

    // Make sure that the gems type match
    if (gBoard[idx] != gemType) return;


    // Check if idx is already visited
    if(arr.indexOf(idx) >= 0) return;

    // Add idx to array
    arr.push(idx);

    // Visit neighbours
    if(xDirection)
    {
        findConnectedGems_(x+1, y, arr, gemType, true, false);
        findConnectedGems_(x-1, y, arr, gemType, true, false);
    }

    if(yDirection)
    {
        findConnectedGems_(x, y+1, arr, gemType, false, true);
        findConnectedGems_(x, y-1, arr, gemType, false, true);
    }
}

function findConnectedGems(x, y)
{
    var xConn = new Array();
    var yConn = new Array();
    if (gBoard[x + y*kBoardWidth] <= -1) return connected;

    findConnectedGems_(x, y, xConn, gBoard[x + y*kBoardWidth], true, false);
    findConnectedGems_(x, y, yConn, gBoard[x + y*kBoardWidth], fale, true);

    return [xConn, yConn];
}

function findAllConnectedGems(x)
{
    gConnectted = new Array();
    for(var x = 0; x < kBoardWidth; x++)
    {
        for(var y = 0; y < kBoardHeight; y++)
        {
            var connected = new Array();
            if(gBoard[x + y * kBoardWidth] <= -1) continue;
            findConnectedGems_(x, y, connected, gBoard[x + y*kBoardWidth], true, true);
            if(connected.length >= 3)
            {
                for(var i = 0; i < connected.length; i++)
                {
                    var gem = gBoardSprites[connected[i]];

                    if(gConnectted.indexOf(gem) < 0)
                    {
                        gConnectted.push(gem);
                        gem.highLight(true);
                    }
                }
            }

//            connected = new Array();
//            if(gBoard[x + y * kBoardWidth] <= -1) continue;
//            findConnectedGems_(x, y, connected, gBoard[x + y*kBoardWidth], false, true);
//            if(connected.length >= 3)
//            {
//                for(var i = 0; i < connected.length; i++)
//                {
//                    var gem = gBoardSprites[connected[i]];
//
//                    if(gConnectted.indexOf(gem) < 0)
//                    {
//                        gConnectted.push(gem);
//                        gem.highLight(true);
//                    }
//                }
//            }
        }
    }
}

function findRows(x)
{
    for(var y = 0; y < kBoardHeight; y++)
    {
        var connected = new Array();
        if(gBoard[x + y * kBoardWidth] <= -1) continue;
        findConnectedGems_(x, y, connected, gBoard[x + y*kBoardWidth]);
        if(connected.length >= 3)
        {
            for(var i = 0; i < connected.length; i++)
            {
                gConnectted.push(gBoardSprites[connected[i]]);
            }
        }
    }
}

function findCols(y)
{
    for(var x = 0; x < kBoardWidth; x++)
    {
            var connected = new Array();
            if(gBoard[x + y * kBoardWidth] <= -1) continue;
            findConnectedGems_(x, y, connected, gBoard[x + y*kBoardWidth]);
            if(connected.length >= 3)
            {
                for(var i = 0; i < connected.length; i++)
                {
                    gConnectted.push(gBoardSprites[connected[i]]);
                }
            }
        }
}