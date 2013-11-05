var gSpritePool;

var GridSprite = cc.Sprite.extend(
{
    gemType : -1,
    yPos : 0,
    ySpeed : 0,
    x : -1,
    y : -1,

    setGemType : function(t)
    {
        this.gemType = t;
    },

    setGrid : function(x, y)
    {
        this.x = x;
        this.y = y;
    },

    getIdx : function()
    {
        return this.x + this.y * kBoardWidth;
    },

    highLight : function(b)
    {
        if(b)
                                  {
                         
            this.setDisplayFrame(cc.SpriteFrameCache.getInstance().getSpriteFrame("crystals/h"+this.gemType+".png"));
                                  }
        else
                                  {
                                    this.setDisplayFrame(cc.SpriteFrameCache.getInstance().getSpriteFrame("crystals/"+this.gemType+".png"));
                                  }
                }
});

GridSprite.createWithType = function(type)
{
    var g;
    if(GridSprite.gSpritePool.length > 0)
    {
        g = GridSprite.gSpritePool.pop();
        if(g.gemType != type)
        {
            g.setGemType(type);
            var frame =  cc.SpriteFrameCache.getInstance().getSpriteFrame("crystals/"+type+".png");
            g.setDisplayFrame(frame);
        }
        g.highLight(false);
    }
    else
    {
        g = new GridSprite();
        g.initWithSpriteFrame(cc.SpriteFrameCache.getInstance().getSpriteFrame("crystals/"+type+".png"));
        g.setGemType(type);
        g.retain();
    }
    
    return g;
}

GridSprite.recoveSprite = function(gem)
{
	if(gem != undefined && gem != null)
	{
    	gem.removeFromParent();
	    GridSprite.gSpritePool.push(gem);
	}
}

GridSprite.releasePool = function()
{
    for(var i = 0; i < GridSprite.gSpritePool.length; i++)
    {
        GridSprite.gSpritePool[i].release();
    }
}

GridSprite.gSpritePool = [];