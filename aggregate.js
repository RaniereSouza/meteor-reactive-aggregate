Future = Npm.require('fibers/future');

ReactiveAggregate = function (sub, collection, pipeline, options) {
  var defaultOptions = {
    observeCollections: collection,
    observeSelector: {},
    observeOptions: {},
    clientCollection: collection._name
  };
  options = _.extend(defaultOptions, options);

  var initializing = true;
  sub._ids = {};
  sub._iteration = 1;

  //console.log('collection: ', collection);
  //console.log('collection.aggregate: ', collection.aggregate(pipeline, {cursor: {}}));

  function update() {

    if (initializing) return;
    console.log('update sub');

    var fut = new Future();
    console.log('declared new Future');

    // add and update documents on the client
    var aggregateCursor = collection.aggregate(pipeline, {cursor: {batchSize: 1}}); // forcing cursor option to aggregate
    console.log('got aggregate cursor');

    aggregateCursor.toArray(function (error, aggregateArray) {

      if (error) {
        throw 'error from ReactiveAggregate: ' + error.message;
        fut.throw(error);
      }

      console.log('got aggregate array');
      console.log(aggregateArray);

      aggregateArray.forEach(function (doc) { 
        console.log(doc);
        if (!sub._ids[doc._id]) {
          sub.added(options.clientCollection, doc._id, doc);
        } else {
          sub.changed(options.clientCollection, doc._id, doc);
        }
        sub._ids[doc._id] = sub._iteration;
      });

      fut['return'](true);
    });

    fut.wait();

    /*.forEach(function (doc) { // forcing cursor option to aggregate
      console.log('iteratorCallback');
      console.log(doc);
      if (!sub._ids[doc._id]) {
        sub.added(options.clientCollection, doc._id, doc);
      } else {
        sub.changed(options.clientCollection, doc._id, doc);
      }
      sub._ids[doc._id] = sub._iteration;
    }, function (error) {
      console.log('endCallback');
      if (error) {
        throw 'error from ReactiveAggregate: ' + error.message;
        //fut.throw(error);
      }
      else {
        //fut['return'](true);
      }
    });*/

    // remove documents not in the result anymore
    _.forEach(sub._ids, function (v, k) {
      if (v != sub._iteration) {
        delete sub._ids[k];
        sub.removed(options.clientCollection, k);
      }
    });
    sub._iteration++;

    return true;
  }

  // track any changes on the collection used for the aggregation
  if (!Array.isArray(options.observeCollections)) {
    // Make array
    var arr = [];
    arr.push(options.observeCollections);
    options.observeCollections = arr;
  }
  // Create observers
  /**
   * @type {Meteor.LiveQueryHandle[]|*}
   */
  var handles = options.observeCollections.map( createObserver );

  /**
   * Create observer
   * @param {Mongo.Collection|*} collection
   * @param {number} i
   * @returns {any|*|Meteor.LiveQueryHandle} Handle
   */
  function createObserver( collection, i) {
    var observeSelector = getObjectFrom(options.observeOptions, i);
    var observeOptions = getObjectFrom(options.observeOptions, i);
    var query = collection.find(observeSelector, observeOptions);
    return handle = query.observeChanges({
      added: update,
      changed: update,
      removed: update,
      error: function (err) {
        throw err;
      }
    });

  }

  /**
   * Get object from array or just object
   * @param {Object|[]} variable
   * @param i
   * @returns {{}}
   */
  function getObjectFrom(variable, i) {
    return Array.isArray(variable)
      ? (
        typeof variable[i] !== 'undefined'
          ? variable[i]
          : {}
      )
      : variable;
  }
  
  // observeChanges() will immediately fire an "added" event for each document in the query
  // these are skipped using the initializing flag
  initializing = false;
  // send an initial result set to the client
  if (update()) {
    // mark the subscription as ready
    console.log('starter call to update subscription returned');
    sub.ready();
  }
  else {
    console.log('starter call to update subscription never returned');
  }

  // stop observing the cursor when the client unsubscribes
  sub.onStop(function () {
    handles.map(function (handle) {
      handle.stop();
    });
  });
};
