(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD.
    define([], factory);
  } else if (typeof exports == 'object') {
    // Node.
    module.exports = factory();
  } else {
    // Browser, root is window.
    root.property = factory();
  }
}(this, function() {
  "use strict";

  var stepVersion = 0,
      watchPool = {
        compute: function(target, fn) {
          this.items.push([]);
          this.targets.push(target);
          var value = fn(target._value),
              observed = this.items.pop();
          this.targets.pop();
          return { value: value, observed: observed };
        },

        push: function(prop) {
          if (this.items.length === 0) return;

          var currentObserved = this.items[this.items.length - 1],
              currentTarget   = this.targets[this.targets.length - 1];

          if (currentTarget === prop) return;

          if (currentObserved.indexOf(prop) === -1) {
            currentObserved.push(prop);
          }
        },

        items: [],
        targets: []
      };

  return {
    get: function() {
      this._log(function() { return 'getting value of ' + this.name(); },
                this);
      dependedOn(this);
      return this._value;
    },

    set: function(initialValue) {
      return clone(this, function(self) { self.set(initialValue); });
    },

    name: function(name) {
      return clone(this, function(self) { self.name(name); });
    },

    computed: function() {
      var fn, initialValue;

      if (arguments.length >= 2) {
        initialValue = arguments[0];
        fn = arguments[1];
      } else if (arguments.length >= 1) {
        fn = arguments[0];
      } else {
        return this.set();
      }

      return clone(this, function(self) {
        self._observed = [];
        self._computation_function = fn;
        self._subscriber = function() { ensureUpdated(self); };

        if (initialValue !== undefined) {
          self.set(initialValue);
        }

        ensureUpdated(self);
      });
    },

    dispose: function() {
      var observed = this._observed || [],
          length = observed.length,
          i = -1;
      this._log(function() { return "disposing " + this.name(); }, this);
      while (++i < length) observed[i].unsubscribe(this._subscriber);
      this._observed = undefined;
      return this._log(function() { return "disposed " + this.name(); }, this);
    },

    subscribe: function(fn) {
      if (!Object.hasOwnProperty.call(this, '_subscribers')) {
        this._subscribers = [];
      }
      if (this._subscribers.indexOf(fn) === -1) {
        this._subscribers.push(fn);
      };

      return this;
    },

    unsubscribe: function(fn) {
      if (!Object.hasOwnProperty.call(this, '_subscribers')) {
        this._subscribers = [];
      }
      var i = this._subscribers.indexOf(fn);
      if (i !== -1) { this._subscribers.splice(i, 1); }

      return this;
    },

    touch: function() {
      var subscribers = this._subscribers.slice(),
          length = subscribers.length,
          i = -1;
      while (++i < length) subscribers[i](this._value);
      return this;
    },

    debug: function() {
      this._log = function(fn, thisArg) {
        console.log(fn.bind(thisArg)());
        return this;
      };
      return this;
    },

    _log: function() { return this; },
    _subscribers: [],
    _stepVersion: 0,
  };

  function setter(value) {
    var previousValue = this._value;
    this._value = value;

    if (this._stepVersion === stepVersion) {
      stepVersion++;
      this._log(function() {
        return this.name() + " is raising step version to " + stepVersion;
      }, this);
    }
    this._stepVersion = stepVersion;

    if (this._value !== previousValue) {
      this._log(function() {
        return "changed " + this.name() + ": " +
                previousValue + " -> " + value;
      }, this);
      this.touch();
    }

    return this;
  }

  function namer(value) {
    if (arguments.length > 0) {
      this._name = value;
      return this;
    }
    return this._name || '<unamed>';
  }

  function ensureUpdated(prop) {
    prop._log(function() {
      return "ensuring that " + prop.name() + " is fully updated";
    });

    if (prop._stepVersion < stepVersion) {
      if (prop._observed && prop._subscriber) {
        prop._log(function() {
          return prop.name() + " needs recomputation";
        }).set(recompute(prop));
      } else {
        prop._stepVersion = stepVersion;
      }

      prop._log(function() {
        return prop.name() + " reached step version " + stepVersion;
      });
    } else {
      prop._log(function() {
        return prop.name() + " is already fully updated";
      });
    }
  }

  function recompute(prop) {
    if (!prop._observed) return;

    var observed, length, i, subscriber = prop._subscriber;

    observed = prop._observed;
    length = observed.length;
    i = -1;
    while (++i < length) observed[i].unsubscribe(subscriber);

    var computation = watchPool.compute(prop, prop._computation_function);

    prop._observed = observed = computation.observed;
    length = observed.length;
    i = -1;
    while (++i < length) observed[i].subscribe(subscriber);

    return computation.value;
  }

  function dependedOn(prop) {
    watchPool.push(prop);
    ensureUpdated(prop);
  }

  function clone(source, amend) {
    return (function(object) {
      object.set = setter;
      object.name = namer;
      amend(object);
      return object;
    })(Object.create(source));
  }
}));
