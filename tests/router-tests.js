var router;

module("The match DSL", {
  setup: function() {
    router = new RouteRecognizer();
  }
});

var matchesRoute = function(path, expected) {
  var actual = router.recognize(path);
  deepEqual(actual, expected);
};

test("supports multiple calls to match", function() {
  router.map(function(match) {
    match("/posts/new").to("newPost");
    match("/posts/:id").to("showPost");
    match("/posts/edit").to("editPost");
  });

  matchesRoute("/posts/new", [{ handler: "newPost", params: {}, isDynamic: false }]);
  matchesRoute("/posts/1", [{ handler: "showPost", params: { id: "1" }, isDynamic: true }]);
  matchesRoute("/posts/edit", [{ handler: "editPost", params: {}, isDynamic: false }]);
});

test("checks whether a route exists", function() {
  router.map(function(match) {
    match("/").to("index", function(match) {
      match("/home").to("home");
    });
    match("/posts/new").to("newPost");
    match("/posts/:id").to("showPost");
    match("/posts/edit").to("editPost");
  });

  equal(router.hasRoute('newPost'), true);
  equal(router.hasRoute('home'), true);
  equal(router.hasRouter('zomg'), false);
  equal(router.hasRouter('index'), false);
});

test("supports nested match", function() {
  router.map(function(match) {
    match("/posts", function(match) {
      match("/new").to("newPost");
      match("/:id").to("showPost");
      match("/edit").to("editPost");
    });
  });

  matchesRoute("/posts/new", [{ handler: "newPost", params: {}, isDynamic: false }]);
  matchesRoute("/posts/1", [{ handler: "showPost", params: { id: "1" }, isDynamic: true }]);
  matchesRoute("/posts/edit", [{ handler: "editPost", params: {}, isDynamic: false }]);
});

test("supports nested handlers", function() {
  router.map(function(match) {
    match("/posts").to("posts", function(match) {
      match("/new").to("newPost");
      match("/:id").to("showPost");
      match("/edit").to("editPost");
    });
  });

  matchesRoute("/posts/new", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "newPost", params: {}, isDynamic: false }]);
  matchesRoute("/posts/1", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "showPost", params: { id: "1" }, isDynamic: true }]);
  matchesRoute("/posts/edit", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "editPost", params: {}, isDynamic: false }]);
});

test("supports deeply nested handlers", function() {
  router.map(function(match) {
    match("/posts").to("posts", function(match) {
      match("/new").to("newPost");
      match("/:id").to("showPost", function(match) {
        match("/index").to("postIndex");
        match("/comments").to("postComments");
      });
      match("/edit").to("editPost");
    });
  });

  matchesRoute("/posts/new", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "newPost", params: {}, isDynamic: false }]);
  matchesRoute("/posts/1/index", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "showPost", params: { id: "1" }, isDynamic: true }, { handler: "postIndex", params: {}, isDynamic: false }]);
  matchesRoute("/posts/1/comments", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "showPost", params: { id: "1" }, isDynamic: true }, { handler: "postComments", params: {}, isDynamic: false }]);
  matchesRoute("/posts/ne/comments", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "showPost", params: { id: "ne" }, isDynamic: true }, { handler: "postComments", params: {}, isDynamic: false }]);
  matchesRoute("/posts/edit", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "editPost", params: {}, isDynamic: false }]);
});

test("supports index-style routes", function() {
  router.map(function(match) {
    match("/posts").to("posts", function(match) {
      match("/new").to("newPost");
      match("/:id").to("showPost", function(match) {
        match("/").to("postIndex");
        match("/comments").to("postComments");
      });
      match("/edit").to("editPost");
    });
  });

  matchesRoute("/posts/new", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "newPost", params: {}, isDynamic: false }]);
  matchesRoute("/posts/1", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "showPost", params: { id: "1" }, isDynamic: true }, { handler: "postIndex", params: {}, isDynamic: false }]);
  matchesRoute("/posts/1/comments", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "showPost", params: { id: "1" }, isDynamic: true }, { handler: "postComments", params: {}, isDynamic: false }]);
  matchesRoute("/posts/edit", [{ handler: "posts", params: {}, isDynamic: false }, { handler: "editPost", params: {}, isDynamic: false }]);
});

test("supports single `/` routes", function() {
  router.map(function(match) {
    match("/").to("posts");
  });

  matchesRoute("/", [{ handler: "posts", params: {}, isDynamic: false }]);
});

test("supports star routes", function() {
  router.map(function(match) {
    match("/").to("posts");
    match("/*everything").to("404");
  });

  //randomly generated strings
  ['w6PCXxJn20PCSievuP', 'v2y0gaByxHjHYJw0pVT1TeqbEJLllVq-3', 'DFCR4rm7XMbT6CPZq-d8AU7k', 'd3vYEg1AoYaPlM9QbOAxEK6u/H_S-PYH1aYtt'].forEach(function(r) {
	  matchesRoute("/" + r, [{ handler: "404", params: {everything: r}, isDynamic: true}]);
  });
});

test("calls a delegate whenever a new context is entered", function() {
  var passedArguments = [];

  router.delegate = {
    contextEntered: function(name, match) {
      ok(match instanceof Function, "The match is a function");
      match("/").to("index");
      passedArguments.push(name);
    }
  };

  router.map(function(match) {
    match("/").to("application", function(match) {
      match("/posts").to("posts", function(match) {
        match("/:post_id").to("post");
      });
    });
  });

  deepEqual(passedArguments, ["application", "posts"], "The entered contexts were passed to contextEntered");

  matchesRoute("/posts", [{ handler: "application", params: {}, isDynamic: false }, { handler: "posts", params: {}, isDynamic: false }, { handler: "index", params: {}, isDynamic: false }]);
});

test("delegate can change added routes", function() {
  router.delegate = {
    willAddRoute: function(context, route) {
      return context + "." + route;
    },

    // Test that both delegates work together
    contextEntered: function(name, match) {
      match("/").to("index");
    }
  };

  router.map(function(match) {
    match("/").to("application", function(match) {
      match("/posts").to("posts", function(match) {
        match("/:post_id").to("post");
      });
    });
  });

  matchesRoute("/posts", [{ handler: "application", params: {}, isDynamic: false }, { handler: "posts", params: {}, isDynamic: false }, { handler: "posts.index", params: {}, isDynamic: false }]);
  matchesRoute("/posts/1", [{ handler: "application", params: {}, isDynamic: false }, { handler: "posts", params: {}, isDynamic: false }, { handler: "posts.post", params: { post_id: "1" }, isDynamic: true }]);
});