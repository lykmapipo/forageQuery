'use strict';


/**
 * @description find an item using specified criteria
 * @param  {Function} done [description]
 * @return {[type]}            [description]
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


    function buildItem(key, value) {
        if (_.isPlainObject(value)) {
            return _.extend(value, {
                id: key
            });
        } else {
            return {
                id: key,
                value: value
            };
        }
    }

    //filter provided key,value pair based on current
    //query condition
    function matchConditions(key, value) {
        var isMatched = false;

        //extend value with its id
        value = _.extend(value, {
            id: key
        });

        //clone conditions
        var conditions = _.clone(self._conditions);

        var paths = _.keys(conditions);

        //iterate over paths and apply
        //condition operation
        _.forEach(paths, function pathMatcher(path) {
            //obtain matcher
            var matcher = conditions[path];
            var _operation = matcher.operation;
            var _value = matcher.value;

            //obtaion value path
            var property = value[path];

            var ok = _[_operation](property, _value);

            isMatched = isMatched || ok;

        });

        return isMatched;
    }

    // if conditions contains id return item with the specified id
    function matchId(key) {
        var conditions = _.clone(self._conditions);
        var id = conditions.id;
        if (id) {
            return _.isEqual(key, id);
        } else {
            return false;
        }
    }

    //execute query
    if (done && _.isFunction(done)) {
        //if there is id in condition clause
        //get item by its id
        if (self._conditions.id) {
            var id = self._conditions.id.value;
            self.localForage.getItem(id, function(error, value) {
                done(error, buildItem(id, value));
            });
        }

        //collect all values match filter
        var items = [];
        //iterate store and collect item(s) based on criteria
        self.localForage.iterate(function onItem(value, key /*, iterationNumber*/ ) {
            //filter item based on id
            if (matchId(key)) {
                return buildItem(key, value);
            }

            //filter item based on condition
            if (matchConditions(key, value)) {
                //collect matched values
                items.push({
                    key: key,
                    value: value
                });
            }
        }, function(error) {
            if (error) {
                done(error);
            } else {

                //prepare result
                items = _.map(items, function(item) {
                    return buildItem(item.key, item.value);
                });

                if (_.size(items) === 1) {
                    done(null, _.first(items));
                } else {
                    done(null, items);
                }
            }
        });

    }

    return self;
};