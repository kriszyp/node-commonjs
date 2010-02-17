/**
 * A minimal monkey patch for Node to achieve CommonJS promise compliance, by 
 * adding a conformant "then" function.
 * 
 * The "then" function supports chaining (it returns a promise that is given the result
 * of the callback computation), correct functional data flow  (computations affect 
 * output, and not input), and handling of promises as the return value of callbacks
 * (and properly deferring the fulfillment of the returned promise). 
 * 
 * The first argument to "then" is the function to be executed when the promise is 
 * successfully fulfilled.
 * The second argument to "then" is the function to be executed when the promise
 * is fulfilled in an error state.
 * 
 * If the either of the callbacks returns a normal value, the promise returned by "then" 
 * is fulfilled with that value. If they throw an exception, the promise returned by 
 * "then"is put in an error state. If they return a promise, the promise returned by
 * "then" will be fulfilled when the returned promise is fulfilled (with the state/value)
 * of that promise.
 *   
 * For example: 

function printFirstAndLast(itemsDeferred){
  findFirst(itemsDeferred).then(sys.puts);
  findLast(itemsDeferred).then(sys.puts);
}
function findFirst(itemsDeferred){
   return itemsDeferred.then(function(items){
     return items[0];
   });
}
function findLast(itemsDeferred){
   return itemsDeferred.then(function(items){
     return items[items.length - 1];
   });
}

var promise = new process.Promise();
printFirstAndLast(promise);
// nothing printed yet, and then:
promise.emitSuccess([1,2,3,4,5]);
//prints:
1
5
 */

process.Promise.prototype.then = function (ok, error) {
  var returnedPromise = new process.Promise();
  
  if (ok) {
    this.addCallback(createPropagator(ok));
  }
  else {
    this.addCallback(function (value) {
      returnedPromise.emitSuccess(value);
    });
  }
  if (error) {
    this.addErrback(createPropagator(error));
  }
  else {
    this.addErrback(function (error) {
      returnedPromise.emitError(error);
    });
  }
  
  return returnedPromise;
  
  function createPropagator (callback) {
    return function (value) {
      try {
        value = callback(value);
        if (value && (typeof value.then === "function")) {
          // return value is a promise, wait until is fulfilled to fulfill the returned promise
          value.then(function (value) {
            returnedPromise.emitSuccess(value);
          },
          function (error) {
            returnedPromise.emitError(error);
          });
        }
        else {
          returnedPromise.emitSuccess(value);
        }
      }
      catch (error) {
        returnedPromise.emitError(error);
      }
    };
  }
};
