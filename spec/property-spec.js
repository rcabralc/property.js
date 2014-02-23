describe("a property", function() {
  it("can be constructed with no initial value", function() {
    var prop = property.set();
    expect(prop.get()).toBe(undefined);
  });

  it("can be constructed with an initial value", function() {
    var prop = property.set('initialValue');
    expect(prop.get()).toBe('initialValue');
  });

  it("can have its value set after being constructed", function() {
    var prop = property.set();
    prop.set('value');
    expect(prop.get()).toBe('value');
  });

  describe("needing a name", function() {
    it("can be constructed having one", function() {
      var prop = property.name('prop');
      expect(prop.name()).toBe('prop');

      var prop = property.name('prop').set();
      expect(prop.name()).toBe('prop');
    });

    it("can have one set after it is constructed", function() {
      var prop = property.set().name('prop');
      expect(prop.name()).toBe('prop');
    });
  });

  describe("which is a computed property", function() {
    var root, plusOne, updateCount;

    beforeEach(function() {
      root = property.name('root').set(1);
      updateCount = 0;
      plusOne = property.name('plusOne').computed(function() {
        updateCount++;
        return root.get() + 1;
      });
    });

    it("is evaluated based on its dependencies", function() {
      expect(plusOne.get()).toBe(2);
    });

    it("is updated when a dependency is updated", function() {
      root.set(1000);
      expect(plusOne.get()).toBe(1001);
    });

    it("is not updated if a dependency is set to the same value", function() {
      var currentCount = updateCount;
      root.set(root.get());
      expect(currentCount).toBe(updateCount);
    });

    it("is not updated after being disposed", function() {
      plusOne.dispose();
      root.set(1000);
      expect(plusOne.get()).toBe(2);
    });

    describe("when a value is set", function() {
      it("just updates to the given value", function() {
        plusOne.set(-1);
        expect(plusOne.get()).toBe(-1);
      });
    });

    describe("dependent on a dependent property", function() {
      var plusOneOne;

      beforeEach(function() {
        root.set(10);
        plusOneOne = property.name('plusOneOne').computed(function() {
          return plusOne.get() + 1;
        });
      });

      it("is updated according to its dependencies", function() {
        expect(plusOneOne.get()).toBe(12);
      });

      it("is updated if a direct dependency is changed", function() {
        plusOne.set(0);
        expect(plusOneOne.get()).toBe(1);
      });

      it("is updated if a transitive dependency is changed", function() {
        root.set(1000);
        expect(plusOneOne.get()).toBe(1002);
      });

      describe(
          "which depends on a property which is already a dependency",
          function() {
        var product, updateCount;

        beforeEach(function() {
          root.set(10);
          updateCount = 0;
          product = property.name('product').computed(function() {
            updateCount++;
            return root.get() * plusOne.get();
          });
        });

        describe("when that dependency is set", function() {
          it("updates just once", function() {
            var currentCount = updateCount;
            root.set(5);
            expect(updateCount).toBe(currentCount + 1);
          });
        });
      });
    });
  });

  describe("having subscribers", function() {
    var root, subscriberCalled, subscriber;

    beforeEach(function() {
      subscriberCalled = false;
      subscriber = function() { subscriberCalled = true; };
      root = property.name('root').set(0).subscribe(subscriber);
    });

    it("doesn't call them if nothing happens after subscription", function() {
      expect(subscriberCalled).toBe(false);
    });

    it("doesn't call them if set to the same value", function() {
      root.set(0);
      expect(subscriberCalled).toBe(false);
    });

    it("calls them if set to a different value", function() {
      root.set(1);
      expect(subscriberCalled).toBe(true);
    });

    it("passes the value set to subscribers", function() {
      var newValue;
      root.subscribe(function(value) { newValue = value; }).set(1);
      expect(newValue).toBe(1);
    });

    it("calls subscribers with current value if .touch() is used", function() {
      var currentValue;
      root.set('current value');
      root.subscribe(function(value) { currentValue = value; }).touch();
      expect(currentValue).toBe('current value');
    });

    describe("when unsubscription occurs", function() {
      beforeEach(function() {
        root.unsubscribe(subscriber);
      });

      it("stops calling subscribers when updated", function() {
        root.set(1);
        expect(subscriberCalled).toBe(false);
      });

      it("stops calling subscribers if .touch() is used", function() {
        root.touch();
        expect(subscriberCalled).toBe(false);
      });
    });
  });
});
