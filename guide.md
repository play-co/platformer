# Building a Platformer in 500 Lines of Code

One of the benefits of building games in JavaScript is that you can
prototype very quickly. A good game engine will abstract away the hard
parts, leaving you to focus on the more creative aspects of game
development. A great game engine will provide that same creative
flexibility without sacrificing performance.

The GC DevKit provides a solid, performant foundation for many
different types of games. We wanted to see if we could take it even
further: What if we narrowed our constraints a bit and built a
framework on top of DevKit, designed for a specific game genre?

We wanted to choose a genre that includes a couple interesting
technical challenges for game developers. It's hard to build a
meaningful framework for simple games where the game engine exists
primarily to position views on a game screen.

For this first experiment, we decided to build a framework for
side-scrolling games. This is a classic genre, filled with greats like
the original Mario and Sonic franchises, as well as modern variants
like [Doodle Jump][], [Wind Runner][], and [Tiny Wings][]. I can't
begin to count the number of hours I spent ignoring my coworkers and
responsibilities because I was engrossed in Tiny Wings.

How can we abstract away some of the hard work in building those
games? All of them have a few constraints in common:

- The game scrolls in one direction, always forward.
- They employ [parallax scrolling](parallax) to provide a sense of depth.
- The level is potentially infinitely long, computed on the fly.
- They have a simple physics engine.

[Wind Runner]: https://play.google.com/store/apps/details?id=jp.naver.SJLGWR
[Doodle Jump]: https://itunes.apple.com/us/app/doodle-jump/id307727765?mt=8
[Tiny Wings]: https://itunes.apple.com/us/app/tiny-wings/id417817520?mt=8
[parallax]: http://en.wikipedia.org/wiki/Parallax_scrolling

Let's build a framework that makes it easy to build games with those
constraints. We'll build a platform game to test the framework too.

## Infinite Levels

To build a game with a never-ending level, we can't just compute the
level at the beginning. We'll need to generate it as we go.

For now, assume we have a `LevelLayer` class of some sort which we
expect developers to subclass.

At the very beginning of the level, we need to generate a chunk *at
least* as long as the screen width. But as the level scrolls forward,
we don't want to build new sections of the level at every frame;
instead, let's generate the level in chunks.

    // in our framework:
    while (needsMoreLevelData()) {
        populateLevel(currentX, CHUNK_SIZE);
    }

Since we're building a framework, we should think about this problem
from the viewpoint of the framework. If we need data about the game,
we need to ask the game developer. We could ask the developer to fill
out a specific area of the level, perhaps one screen width at a time:

    function populate(currentX, chunkSize) {
        // populate the level here
    }

That seems reasonable at first glance, but what happens if we're
building a platform game that has platforms wider than one screen? A
fixed-width chunk wouldn't be flexible enough.

Instead, let's just give the game developer the `x` coordinate where
we need to start populating the level, and we'll keep asking them for
more data if they don't provide enough. We need to know how far ahead
they've prepopulated the level, so let's have them return the width
of the chunk they populated:

    function populate(currentX) {
        var platform = new View(...);
        var spaceBetweenPlatforms = 100;
        return platform.width + spaceBetweenPlatforms;
    }

Cool! Now we have a generic way for the developer to specify chunks of
the level as we scroll forward. As the screen scrolls forward, we'll
just call their `populate()` function and prepopulate enough level to
ensure the screen is always filled.

But wait, we're not quite done! As the screen scrolls forward, old
level data falls off the left of the screen. If we leave it there,
we'll eventually run out of memory. One of the constraints we chose
when selecting this genre was that we only scroll forward, so we know
we don't need the old level data once it leaves the screen. We don't
want the game developer to have to manually remove old level chunks,
so let's make that part of our framework too:

    for (var i = 0; i < subviews.length; i++) {
        var subview = subviews[i];
        if (subview.x + subview.width < level.x) {
            subview.removeFromSuperview();
        }
    }

## Performance Optimization

While we have avoided running out of memory, we need to address a
couple common causes of performance problem in scrolling games.

If we're going to generate the level on the fly, the `populate()`
function needs to run quickly, otherwise we'll notice hiccups in our
game every time we generate a new chunk of a level. Additionally, when
we allocate and destroy new views, they need to be garbage collected
by the JavaScript runtime, which can cause noticeable lag spikes at
arbitrary times. To write a performant game, we need to avoid
allocating new memory whenever possible, so that we can reduce the
need for garbage collection.

The GC DevKit provides a `ui.ViewPool` class, which we use in our
games to preallocate a pool of views. When we need a new view, we
obtain one from the pool; when we're done with it, we release it. This
pattern comes up often in game development, but it's especially
important in scrolling games where we're constantly generating new
views.

It needs to be drop-dead simple and intuitive for developers to use a
ViewPool, and it should be as unobtrusive as possible. In our
framework, the only place developers will be creating new views is
within the `LevelLayer.populate()` function. They already create views
like so:

    var view = new ImageView({x: startX, ...});
    
Assuming we have a `ViewPool` in our `LevelLayer`, let's create a
function on the LevelLayer to make it easy to fetch a pooled view. We
have a few requirements, though: we need to be able to instantiate
*any* class for the view pool (like an ImageView or EnemyView), and we
may want to be able to generate different types of the same object
(like an ImageView representing a coin, and another ImageView
representing a heart). A `ui.ViewPool` can only hold one class of
object. In other words, our level may need several different pools,
depending on the class and group of the given object.

Putting that all together:

    LevelLayer.obtainView = function(viewClass, viewOpts, group) {
        var group = viewClass + group;
        var pool = this.pools[group];
        if (!pool) {
            pool = this.pools[group] = new ui.ViewPool({
                ctor: viewClass,
                initOpts: viewOpts
            });
        }
        return pool.obtainView(viewOpts);
    }

If you're confused, the
[ui.ViewPool docs][http://docs.gameclosure.com/api/ui-viewpool.html]
may help.

Now we obtain our views from a pool, but we need to *release* them.
Otherwise we're right back where we started, running out of memory and
all that.

Again, views might disappear for a couple reasons:

- The developer removed them from the screen
- The view fell off the left of the screen

Fortunately, the DevKit provides an event that we can handle to detect
when a view gets removed from the screen, and we can release the view
there:

    view.on("ViewRemoved", function () {
        pool.releaseView(view);
    });

Now, the developer simply needs to use `obtainView(ViewClass)` rather
than `new ViewClass()`. Views automatically come from a pool, and they
are released back into the pool when the view gets removed from the
screen. This avoids excess garbage collection and makes the game
perform more smoothly.

## Parallax Scrolling

All sorts of games use parallax scrolling to provide a sense of depth.
Fortunately, most of the hard work has already been included in our
framework through the view recycling code above. A parallax game is
really just a bunch of infinitely-scrolling views stacked on top of
each other, with each one scrolling proportionally to the others.
Layers designed to seem far away will scroll more slowly; layers close
to the camera will scroll faster.

At this point, it's just a bit of math and API design to end up with
something like this:

    var ParallaxView = Class(ui.View, function () {
        
        this.addLayer = function (opts) {
            this.addSubview(new Layer({
                superview: this,
                populate: opts.populate,
                zIndex: opts.zIndex
            });
        }
        
        this.scrollTo = function(x, y) {
            // scroll each layer independently
        }
    });
    
    var Layer = Class(ui.View, function () {
        this.scrollTo = function(x, y) {
            // scroll the view
            // then populate, if necessary
        }
    });

Using that view becomes pretty simple:

    var parallaxView = new ParallaxView({ superview: this.view });
    parallaxView.addLayer({
        distance: 10,
        populate: function (layer, x) {
            var platform = new ImageView(...);
            layer.addSubview();
            return platform.style.width;
        }
    });

And with that, we have a view that supports many layers of an
infinitely-scrolling level!

## Physics

The DevKit doesn't yet ship with a dedicated physics engine, but we've
created games using JavaScript ports of Box2D. In this case, though,
Box2D would be overkill. We just need some simple collision detection
and movement. Something simple and flexible. Just enough physics to
make game development easy without burdening the developer with the
harsh mechanics of physical reality.

I won't go into great detail about the implementation of the physics
engine I built for this framework (the source is well-commented), but
I'll describe its API. I built this engine in one day, so if you think
you can contribute improvements, let's join forces!

To be intuitive, our physics needs to hook directly into the existing
view system. So we should be able to either subclass a `Physics`
component, or add physics to an existing view like a mixin. This
framework allows both options, for convenience.

In a nutshell:

    var player = new SpriteView(...);
    
    Physics.addToView(player);
    
    player.position.x = 100; // same as player.style.x
    player.velocity.x = 200; 
    player.acceleration.y = 400;
    
    var collisions = player.getCollisions("ground");

DevKit's `ui.View` contains a number of useful properties, but as I
was developing this framework, I found that resulting game code was
clearer with a few helper accessors: `.getBottom()`, `.getRight()`,
`.getCenter()`, and the like. In other words, any view that has
`Physics` added automatically becomes enriched with these methods.

## Bonus Goodies

There are a couple other pain points I found while developing this
test game:

### Displaying a Score Efficiently

The DevKit's `TextView` isn't optimal for displaying a high score
counter. Internally, it buffers strings of text for display, and a
score counter changes constantly, perhaps every frame. Additionally,
most score counters display the score in a monospace font for a
cleaner look, and most fonts are variable-width.

I've included a `ScoreView` class that we've used internally, which
takes in a set of bitmaps representing individual digits in a score.
At runtime, `ScoreView` will render a bitmap of each character, a
fixed-width apart, and cache each digit individually. This allows the
engine to render a new score every frame without degrading
performance. Other than performance, a `ScoreView` is used just like a
regular `TextView`: call `.setText(score)`.

### Aspect Ratios

Every day, a new Android phone appears with a different screen
resolution. By default, DevKit renders your game in a one-to-one
mapping, with your main view sized equal to the screen resolution. In
most games, you don't want that kind of pixel-precision: you want to
be able to write your game with a specific size in mind, and have it
automatically scale to fit the screen size. Included in the
`platformer.util` module in this framework is a function called
`scaleRootView(app, width, height)`; it resizes your main view to fit
within the screen, letterboxing it if necessary. Then you can write
your game layout logic with a fixed size in mind, without making
changes for different screen sizes.

## Results & Demo

Working in JavaScript, and with the DevKit, game development is
already incredibly quick. I wrote both this framework and the sample
game in only a couple days. Now that we've taken the time to abstract
away some of the core concepts from a platformer-style game, we can
all create a game like this even more quickly, with less code.

This is nothing magic. Looking at the platformer framework, you'll see
that it isn't a massive, all-encompassing project: It's pretty simple
and easy to follow. But it's powerful enough that it makes developing
platform games incredibly easy. Designing a framework is always a
balancing act: If you abstract away too much, you end up with an
inflexible monstrosity that's hard to understand and maintain. But if
you abstract away too little, you have a lot of extra code for little
gain.

Take a look at this framework, [fork it on GitHub][github], and see if
you can improve it.

[github]: http://github.com/gameclosure/platformer





    
