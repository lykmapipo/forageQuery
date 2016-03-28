'use strict';


/**
 * @description find an item using specified criteria
 * @param  {Function} [done] callback to invoke on success or error
 * @return {Query}           query instance
 */
Query.prototype.find = function(criteria, done) {
    /*jshint validthis:true*/
    var self = this;

    //tell what operation to perform
    self._operation = 'find';

    if (_.isFunction(criteria)) {
        done = criteria;
        criteria = undefined;
    }

    //build or merge criterias
    if (criteria) {
        self.where(criteria);
    }

    //execute query
    if (done && _.isFunction(done)) {
        //if there is id in condition clause
        //get item by its id
        if (self._conditions.id || self._conditions._id) {
            var id = self._conditions.id.$eq || self._conditions._id.$eq;
            self.localForage.getItem(id, function(error, value) {
                return done(error, self._buildItem(id, value));
            });
        }

        //otherwise iterate through and
        //collect all values match filter
        var items = [];

        //iterate store and collect item(s) based on criteria
        self.localForage.iterate(function onItem(value, key /*, iterationNumber*/ ) {
            //filter item based on condition
            if (self._passFilter(key, value)) {
                //collect matched values
                items.push({
                    key: key,
                    value: value
                });
            }
        }, function(error) {
            if (error) {
                return done(error);
            } else {

                try {

                    //prepare result
                    items = _.map(items, function(item) {
                        return self._buildItem(item.key, item.value);
                    });

                    //build Mingo Cursor
                    items =
                        new Mingo.Cursor(items, self._conditions, self._projection);

                    //apply skip and limit to cursor
                    if (self._skip && self._limit) {
                        items = items.skip(self._skip).limit(self._limit);
                    }

                    //apply sort to cursor
                    if (self._sort) {
                        items = items.sort(self._sort);
                    }

                    if (self._aggregation) {
                        //TODO handle other aggregations
                        items = items.count();
                    } else {

                        //fetch item(s)
                        items =
                            (self._limit && self._limit === 1) ?
                            items.first() : items.all();
                    }

                    //return item(s)
                    return done(null, items);

                } catch (e) {
                    return done(e);
                }
            }
        });

    }

    return self;
};


/**
 * @function
 * @description filter provided key,value pair based on current query condition
 * @param  {Mixed} key   a key/id of the value
 * @param  {Mixed} value a value to be filtered
 * @private
 */
Query.prototype._passFilter = function(key, value) {
    /*jshint validthis:true*/
    var self = this;

    //extend value with its id
    value = _.extend(value, {
        id: key,
        _id: key
    });

    //clone conditions
    var conditions = _.clone(self._conditions);

    //make use of Mingo.Query to compile current conditions
    self._mingo = self._mingo || new Mingo.Query(conditions);

    //check if value(doc) match/pass specified conditions
    var pass = self._mingo.test(value);

    return pass;
};