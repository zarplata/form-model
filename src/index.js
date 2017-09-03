import assign from 'lodash/assign';
import cloneDeep from 'lodash/cloneDeep';
import isObject from 'lodash/isObject';
import isEmpty from 'lodash/isEmpty';
import clone from 'lodash/clone';
import uniqueId from 'lodash/uniqueId';

export default class FormModelPrototype {
    constructor(componentUpdate) {
        this.formData = this._getDefaultModel();

        this.componentUpdate = componentUpdate;

        this._extendWithNameAndKeyRecursive(this.formData);

        this._invalidFields = [];
    }

    getInvalidFields() {
        return this._invalidFields;
    }

    _addInvalidField(field) {
        this._invalidFields.push(field);
    }

    _resetInvalidFields() {
        this._invalidFields = [];
    }

    getData() {
        return this.formData;
    }

    setData(values) {
        this.formData = this._mergeRecursive(this._getDefaultModel(), values);

        this._extendWithNameAndKeyRecursive(this.formData);
    }

    isEmpty() {
        return this._isEmptyRecursive(this.formData);
    }

    _isEmptyRecursive(node) {
        const isEmptyNode = this._isEmptyNode(node);

        if (isEmptyNode) {
            return true;
        }

        if (node.hasOwnProperty('properties')) {
            for (let field in node.properties) {
                if (!this._isEmptyRecursive(node.properties[field])) {
                    return false
                }
            }
            return true;
        } else if (node.hasOwnProperty('items')) {
            if (!node.items.length) return true;
            for (let i in node.items) {
                if (!this._isEmptyRecursive(node.items[i])) {
                    return false;
                }
            }
            return true;
        }

        return false;
    }

    _isEmptyNode(node) {
        if (node.hasOwnProperty('value')) {
            return isEmpty(node.value)
        }

        return false;
    }

    _getDefaultModel() {
        return {};
    }

    _extendWithNameAndKeyRecursive(node) {
        let { name = '' } = node;

        if (node.hasOwnProperty('properties')) {
            name = name ? `${name}.properties` : 'properties';

            for (let key in node.properties) {
                let propertyNode = node.properties[key];
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
        if (node.hasOwnProperty('properties')) {
            if (valueNode.properties) {
                for (let key in node.properties) {
                    this._mergeRecursive(node.properties[key], valueNode.properties[key] || []);
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

        if (this.componentUpdate) {
            this.componentUpdate();
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

        if (this.componentUpdate) {
            this.componentUpdate();
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

        if (this.componentUpdate) {
            this.componentUpdate();
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

        if (node.hasOwnProperty('properties')) {
            for (let key in node.properties) {
                isValid = this._validateRecursive(node.properties[key], needInvalidFields) && isValid;
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