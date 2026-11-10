import test from 'node:test';import assert from 'node:assert/strict';
import {unitId,isoDate,csvSafe,money} from '../src/validation.js';
test('identificadores preservam unidades',()=>{assert.equal(unitId('41'),true);assert.equal(unitId('2013'),true);assert.equal(unitId('__admin__'),false);});
test('valida datas calendáricas',()=>{assert.equal(isoDate('2026-02-29'),false);assert.equal(isoDate('2028-02-29'),true);});
test('evita fórmulas na exportação',()=>{assert.equal(csvSafe('=1+1'),"'=1+1");});
test('valor monetário',()=>{assert.equal(money('-1'),null);assert.equal(money('35.5'),35.5);});
