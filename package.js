Package.describe({
  name: "ranieresouza:reactive-aggregate",
  version: "0.7.0",
  // Brief, one-line summary of the package.
  summary: "Reactively publish aggregations (slightly modified to solve problem w/ MongoDB 3.6 in Meteor v.1.4).",
  // URL to the Git repository containing the source code for this package.
  git: "https://github.com/RaniereSouza/meteor-reactive-aggregate",
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: "README.md"
});

Package.onUse(function(api) {
  api.versionsFrom("1.2.1");
  api.use("underscore");
  api.use("mongo");
  api.use("meteorhacks:aggregate@1.3.0");
  api.mainModule("aggregate.js", "server");
  api.export("ReactiveAggregate");
});
