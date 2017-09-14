/* global it, describe */

import { assert } from 'chai';

import FormModel from './../src';

describe('Create form-model', () => {
    it('Install form', () => {
        const schema = () => ({
            fields: {
                name: {
                    value: 'My name',
                    customData: 'Eeeee custom'
                }
            }
        });

        const instansModel = new FormModel(schema);
        const dataModel = instansModel.getData();

        assert.isFunction(dataModel.fields.name.handleChange, 'has field handleChange');
        assert.isString(dataModel.fields.name.name, 'has field name');
        assert.isDefined(dataModel.fields.name.customData, 'has field customData');
    });
});
