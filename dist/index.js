'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _assign = require('lodash/assign');

var _assign2 = _interopRequireDefault(_assign);

var _cloneDeep = require('lodash/cloneDeep');

var _cloneDeep2 = _interopRequireDefault(_cloneDeep);

var _isObject = require('lodash/isObject');

var _isObject2 = _interopRequireDefault(_isObject);

var _isEmpty = require('lodash/isEmpty');

var _isEmpty2 = _interopRequireDefault(_isEmpty);

var _clone = require('lodash/clone');

var _clone2 = _interopRequireDefault(_clone);

var _uniqueId = require('lodash/uniqueId');

var _uniqueId2 = _interopRequireDefault(_uniqueId);

var _isFunction = require('lodash/isFunction');

var _isFunction2 = _interopRequireDefault(_isFunction);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FormModelPrototype = function () {
    function FormModelPrototype(defaultModel, dispatch) {
        var _this = this;

        _classCallCheck(this, FormModelPrototype);

        this.validate = function () {
            _this._resetInvalidFields();
            _this._formData = _extends({}, _this._formData);

            return _this._validateRecursive(_this._formData, true);
        };

        this._defaultModel = defaultModel;
        this._dispatch = dispatch;

        this._formData = this._getDefaultModel();

        this._extendWithNameAndKeyRecursive(this._formData);

        this._invalidFields = [];
    }

    _createClass(FormModelPrototype, [{
        key: 'getInvalidFields',
        value: function getInvalidFields() {
            return this._invalidFields;
        } // ddd

    }, {
        key: 'getData',
        value: function getData() {
            return this._formData;
        }
    }, {
        key: 'setData',
        value: function setData(values) {
            this._formData = this._mergeRecursive(this._getDefaultModel(), values);

            this._extendWithNameAndKeyRecursive(this._formData);
        }
    }, {
        key: '_addInvalidField',
        value: function _addInvalidField(field) {
            this._invalidFields.push(field);
        }
    }, {
        key: '_resetInvalidFields',
        value: function _resetInvalidFields() {
            this._invalidFields = [];
        }
    }, {
        key: '_getDefaultModel',
        value: function _getDefaultModel() {
            if ((0, _isFunction2.default)(this._defaultModel)) {
                return this._defaultModel();
            }

            return this._defaultModel;
        }
    }, {
        key: '_extendWithNameAndKeyRecursive',
        value: function _extendWithNameAndKeyRecursive(node) {
            var _this2 = this;

            var _node$name = node.name,
                name = _node$name === undefined ? '' : _node$name;


            if (node.hasOwnProperty('fields')) {
                name = name ? name + '.fields' : 'fields';

                var _loop = function _loop(key) {
                    var propertyNode = node.fields[key];
                    propertyNode.name = name + '.' + key;

                    propertyNode.handleChange = function (value, needValidate) {
                        _this2.set(value, propertyNode.name, needValidate);
                    };

                    _this2._extendWithNameAndKeyRecursive(propertyNode);
                };

                for (var key in node.fields) {
                    _loop(key);
                }
            } else if (node.hasOwnProperty('items')) {
                var originName = node.name || '';

                node.handleAdd = function (value) {
                    _this2.addItem(originName, node.defaultItem(value));
                };
                name = name ? name + '.items' : 'items';

                for (var key in node.items) {
                    var itemNode = node.items[key];

                    itemNode.handleRemove = this.removeItem.bind(this, originName, key);
                    itemNode.name = name + '.' + key;

                    if (!itemNode.key) {
                        itemNode.key = (0, _uniqueId2.default)('form_array_item_key_');
                    }

                    this._extendWithNameAndKeyRecursive(itemNode);
                }
            }
        }
    }, {
        key: '_mergeRecursive',
        value: function _mergeRecursive(node, valueNode) {
            if (node.hasOwnProperty('fields')) {
                if (valueNode.fields) {
                    for (var key in node.fields) {
                        this._mergeRecursive(node.fields[key], valueNode.fields[key] || []);
                    }
                }
            } else if (node.hasOwnProperty('items')) {
                if (valueNode.items) {
                    var count = valueNode.items.length - node.items.length;

                    for (var i = 0; i < count; i++) {
                        node.items.push((0, _cloneDeep2.default)(node.defaultItem()));
                    }

                    for (var _key in node.items) {
                        this._mergeRecursive(node.items[_key], valueNode.items[_key] || []);
                    }
                }
            } else {
                (0, _assign2.default)(node, valueNode);
            }

            node = (0, _clone2.default)(node);

            return node;
        }
    }, {
        key: 'removeItem',
        value: function removeItem(name, index) {
            console.log('remove', name + ".items[" + index + "]");

            this._formData = _extends({}, this._formData);
            var field = this._updateRecursive(this._formData, name.split('.'));
            var items = field.items;


            items.splice(index, 1);
            field.items = (0, _clone2.default)(items);

            this._extendWithNameAndKeyRecursive(field);

            this._unsetError(field);

            if (this._dispatch) {
                this._dispatch();
            }
        }
    }, {
        key: 'addItem',
        value: function addItem(name, item) {
            console.log('add', name, JSON.stringify(item));

            this._formData = _extends({}, this._formData);

            var field = this._updateRecursive(this._formData, name.split('.'));
            var items = field.items;


            items.push(item);
            field.items = (0, _clone2.default)(items);

            this._extendWithNameAndKeyRecursive(field);

            this._unsetError(item);

            if (this._dispatch) {
                this._dispatch();
            }
        }
    }, {
        key: 'set',
        value: function set(value, name, needValidate) {
            console.log('set', name, JSON.stringify(value));

            this._formData = _extends({}, this._formData);

            var field = this._updateRecursive(this._formData, name.split('.'));
            field.value = value;

            if (field.error) {
                this._validateRecursive(field, false);
            } else if (needValidate) {
                this._validateRecursive(this._formData, false);
            }

            if (this._dispatch) {
                this._dispatch();
            }
        }
    }, {
        key: '_updateRecursive',
        value: function _updateRecursive(node, _ref) {
            var _ref2 = _toArray(_ref),
                currentName = _ref2[0],
                tailNames = _ref2.slice(1);

            var newNode = node[currentName] = (0, _clone2.default)(node[currentName]);

            if (!tailNames.length) {
                return newNode;
            }

            return this._updateRecursive(newNode, tailNames);
        }
    }, {
        key: '_validateRecursive',
        value: function _validateRecursive(node, needInvalidFields) {
            var isValid = this._validateField(node);

            if (!isValid && needInvalidFields) {
                this._addInvalidField(node);
            }

            if (node.hasOwnProperty('fields')) {
                for (var key in node.fields) {
                    isValid = this._validateRecursive(node.fields[key], needInvalidFields) && isValid;
                }
            } else if (node.hasOwnProperty('items')) {
                for (var _key2 in node.items) {
                    isValid = this._validateRecursive(node.items[_key2], needInvalidFields) && isValid;
                }
            }

            return isValid;
        }
    }, {
        key: '_validateField',
        value: function _validateField(field) {
            // если нет правила валидации, то все ок

            if (!field.validation) {
                this._unsetError(field);
                return true;
            }

            // проверяем необязательное поле оно не заполнено, то все ок
            if (!field.required) {
                if ((0, _isObject2.default)(field.value) && (0, _isEmpty2.default)(field.value) || !field.value) {
                    this._unsetError(field);
                    return true;
                }
            }

            // иначе валидируем
            var isFieldValid = field.validation(field, this._formData);

            if (isFieldValid) {
                this._unsetError(field);
            } else {
                this._setError(field);
            }

            return isFieldValid;
        }
    }, {
        key: '_setError',
        value: function _setError(field) {
            field.error = true;
            this._updateRecursive(this._formData, field.name.split('.'));
        }
    }, {
        key: '_unsetError',
        value: function _unsetError(field) {
            field.error = false;
        }
    }]);

    return FormModelPrototype;
}();

exports.default = FormModelPrototype;