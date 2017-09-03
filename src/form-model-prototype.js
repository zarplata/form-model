import assign from 'lodash/assign';
import cloneDeep from 'lodash/cloneDeep';
import isObject from 'lodash/isObject';
import isEmpty from 'lodash/isEmpty';
import clone from 'lodash/clone';
import uniqueId from 'lodash/uniqueId';
import isFunction from 'lodash/isFunction';

export default class FormModelPrototype {
    constructor(defaultModel, dispatch) {
        this._defaultModel = defaultModel;
        this._dispatch = dispatch;

        this.formData = this._getDefaultModel();

        this._extendWithNameAndKeyRecursive(this.formData);

        this._invalidFields = [];
    }

    getInvalidFields() {
        return this._invalidFields;
    }

    getData() {
        return this.formData;
    }

    setData(values) {
        this.formData = this._mergeRecursive(this._getDefaultModel(), values);

        this._extendWithNameAndKeyRecursive(this.formData);
    }

    _addInvalidField(field) {
        this._invalidFields.push(field);
    }

    _resetInvalidFields() {
        this._invalidFields = [];
    }

    _getDefaultModel() {
        if (isFunction(this._defaultModel)) {
            return this._defaultModel()
        }

        return this._defaultModel;
    }

    _extendWithNameAndKeyRecursive(node) {
        let { name = '' } = node;

        if (node.hasOwnProperty('fields')) {
            name = name ? `${name}.fields` : 'fields';

            for (let key in node.fields) {
                let propertyNode = node.fields[key];
                propertyNode.name = `${name}.${key}`;

                propertyNode.handleChange = (value, needValidate) => {
                    this.set(value, propertyNode.name, needValidate);
                };

                this._extendWithNameAndKeyRecursive(propertyNode);
            }
        } else if (node.hasOwnProperty('items')) {
            const originName = node.name || '';

            node.handleAdd = value => {
                this.addItem(originName, node.defaultItem(value));
            };
            name = name ? `${name}.items` : 'items';

            for (let key in node.items) {
                let itemNode = node.items[key];

                itemNode.handleRemove = this.removeItem.bind(this, originName, key);
                itemNode.name = `${name}.${key}`;

                if (!itemNode.key) {
                    itemNode.key = uniqueId('form_array_item_key_');
                }

                this._extendWithNameAndKeyRecursive(itemNode);
            }
        }
    }

    _mergeRecursive(node, valueNode) {
        if (node.hasOwnProperty('fields')) {
            if (valueNode.fields) {
                for (let key in node.fields) {
                    this._mergeRecursive(node.fields[key], valueNode.fields[key] || []);
                }
            }
        } else if (node.hasOwnProperty('items')) {
            if (valueNode.items) {
                var count = valueNode.items.length - node.items.length;

                for (let i = 0; i < count; i++) {
                    node.items.push(cloneDeep(node.defaultItem()));
                }

                for (let key in node.items) {
                    this._mergeRecursive(node.items[key], valueNode.items[key] || []);
                }
            }
        } else {
            assign(node, valueNode);
        }

        node = clone(node);

        return node;
    }

    removeItem(name, index) {
        console.log('remove', name + ".items[" + index + "]");

        this.formData = {...this.formData};
        const field = this._updateRecursive(this.formData, name.split('.'));
        const { items } = field;

        items.splice(index, 1);
        field.items = clone(items);

        this._extendWithNameAndKeyRecursive(field);

        this._unsetError(field);

        if (this._dispatch) {
            this._dispatch();
        }
    }

    addItem(name, item) {
        console.log('add', name, JSON.stringify(item));

        this.formData = {...this.formData};

        const field = this._updateRecursive(this.formData, name.split('.'));
        const { items } = field;

        items.push(item);
        field.items = clone(items);

        this._extendWithNameAndKeyRecursive(field);

        this._unsetError(item);

        if (this._dispatch) {
            this._dispatch();
        }
    }

    set(value, name, needValidate) {
        console.log('set', name, JSON.stringify(value));

        this.formData = {...this.formData};

        let field = this._updateRecursive(this.formData, name.split('.'));
        field.value = value;

        if (field.error) {
            this._validateRecursive(field, false);
        } else if (needValidate) {
            this._validateRecursive(this.formData, false);
        }

        if (this._dispatch) {
            this._dispatch();
        }
    }

    validate = () => {
        this._resetInvalidFields();
        this.formData = {...this.formData};

        return this._validateRecursive(this.formData, true);
    }

    _updateRecursive(node, [ currentName, ...tailNames ]) {
        const newNode = node[currentName] = clone(node[currentName]);

        if (!tailNames.length) {
            return newNode;
        }

        return this._updateRecursive(newNode, tailNames);
    }

    _validateRecursive(node, needInvalidFields) {
        var isValid = this._validateField(node);

        if (!isValid && needInvalidFields) {
            this._addInvalidField(node);
        }

        if (node.hasOwnProperty('fields')) {
            for (let key in node.fields) {
                isValid = this._validateRecursive(node.fields[key], needInvalidFields) && isValid;
            }
        } else if (node.hasOwnProperty('items')) {
            for (let key in node.items) {
                isValid = this._validateRecursive(node.items[key], needInvalidFields) && isValid;
            }
        }

        return isValid;
    }

    _validateField(field) {
        // если нет правила валидации, то все ок

        if (!field.validation) {
            this._unsetError(field);
            return true;
        }

        // проверяем необязательное поле оно не заполнено, то все ок
        if (!field.required) {
            if ( (isObject(field.value) && isEmpty(field.value)) || !field.value) {
                this._unsetError(field);
                return true;
            }
        }

        // иначе валидируем
        var isFieldValid = field.validation(field, this.formData);

        if (isFieldValid) {
            this._unsetError(field);
        } else {
            this._setError(field);
        }

        return isFieldValid;
    }

    _setError(field) {
        field.error = true;
        this._updateRecursive(this.formData, field.name.split('.'));
    }

    _unsetError(field) {
        field.error = false;
    }
}