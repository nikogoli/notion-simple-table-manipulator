# Functions
## Index
- [add_number](#async--add_number--promiseappendblockchildrenresponse)
- [add_row_from_list](#async--add_row_from_list--promiseappendblockchildrenresponse)
- [apply_color](#apply_color)
    - [maxmin](#async--maxmin---promiseappendblockchildrenresponse)
- [calculate_cell](#async--calculate_cell--promiseappendblockchildrenresponse)
- [calculate_table](#calculate_table)
    - [sum](#async--sum--promiseappendblockchildrenresponse)
    - [average](#async--average--promiseappendblockchildrenresponse)
    - [count](#async--count--promiseappendblockchildrenresponse)
    - [max](#async--max--promiseappendblockchildrenresponse)
    - [second_max](#async--second_max--promiseappendblockchildrenresponse)
    - [max_name](#async--max_name--promiseappendblockchildrenresponse)
    - [second_max_name](#async--second_max_name--promiseappendblockchildrenresponse)
    - [min](#async--min--promiseappendblockchildrenresponse)
    - [second_min](#async--second_min--promiseappendblockchildrenresponse)
    - [min_name](#async--min_name--promiseappendblockchildrenresponse)
    - [second_min_name](#async--second_min_name--promiseappendblockchildrenresponse)
- [convert](#convert)
    - [to_list](#async--to_list---promiseappendblockchildrenresponse)
    - [from_list](#async--from_list---promiseappendblockchildrenresponse)
- [from_file](#async--from_file--promiseappendblockchildrenresponse)
- [join](#async--join--promiseappendblockchildrenresponse)
- [multi_processing](#async--multi_processing--promiseappendblockchildrenresponse)
- [separate](#async--separate--promiseappendblockchildrenresponse)
- [sort](#async--sort--promiseappendblockchildrenresponse)
- [transpose](#async--transpose--promiseappendblockchildrenresponse)


<br>

## [async]  add_number() : Promise\<AppendBlockChildrenResponse\>

Adds row-number as a left-est cell to each rows.

#### parameters:
```typescript
(numbering_options?:{
	label?: string,
	text_format?: string,
	start_number?: number,
	step?: number
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param *(optional)* **label** *(default: "")* : **string**<br>


- @param *(optional)* **text_format** *(default: "{num}")* : **string**<br>
 {num} in this param is replaced with number.

- @param *(optional)* **start_number** *(default: 1)* : **string**<br>


- @param *(optional)* **step** *(default: 1)* : **string**<br>


<br>

## [async]  add_row_from_list() : Promise\<AppendBlockChildrenResponse\>

Adds rows to the table from lists in the same parent block.

#### parameters:
```typescript
(appendfrom_options: {
	cell_separation_by: string,
	label_separation_by?: string
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **cell_separation_by** : **string**<br>
Each line-text is splited by this param

- @param *(optional)* **label_separation_by**  : **string**<br>
 If provided, each text is splited by this param to column-label and cell-text

<br>

## apply_color

### [async]  maxmin () : Promise\<AppendBlockChildrenResponse\> 

changes colors of max / min cells' texts in rows or colmuns in table

#### parameters:
```typescript
(applycolor_options: {
	direction: "R" | "C",
	not_apply_to?: Array<string> | Array<number>,
	ignore?: Array<string> | Array<number>,
	max?: ApiColor,
	min?: ApiColor
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **direction** : **"R" | "C"**<br>
Calculates max/min for each row, or for each column

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, color-changes are not applied to the cells of these rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, max-min-calculation ignores the cells of these rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

## [async]  calculate_cell() : Promise\<AppendBlockChildrenResponse\>

Evaluates cells' texts as mathematical expressions and Replaces the texts with calculated results.

#### parameters:
```typescript
(basic_options?: {delete?:boolean, inspect?:boolean})
```



<br>

## calculate_table

### [async]  sum() : Promise\<AppendBlockChildrenResponse\> 

Calculates summuation of each row/colmun and Appends the results as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  average() : Promise\<AppendBlockChildrenResponse\> 

Calculates average of each row/colmun and Appends the results as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  count() : Promise\<AppendBlockChildrenResponse\> 

Counts of each row/colmun's cell and Appends the results as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-column-count row, or an each-row-count colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, Couting is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, Counting ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  max() : Promise\<AppendBlockChildrenResponse\> 

Calculates maximum of each row/colmun and Appends the results as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  second_max() : Promise\<AppendBlockChildrenResponse\> 

Calculates second maximum of each row/colmun and Appends the results as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  max_name() : Promise\<AppendBlockChildrenResponse\> 

Calculates maximum of each row/colmun and Appends these cell's column/row-labels as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  second_max_name() : Promise\<AppendBlockChildrenResponse\> 

Calculates second maximum of each row/colmun and Appends these cell's column/row-labels as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  min() : Promise\<AppendBlockChildrenResponse\> 

Calculates minimum of each row/colmun and Appends the results as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  second_min() : Promise\<AppendBlockChildrenResponse\> 

Calculates second minimum of each row/colmun and Appends the results as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  min_name() : Promise\<AppendBlockChildrenResponse\> 

Calculates minimum of each row/colmun and Appends these cell's column/row-labels as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  second_min_name() : Promise\<AppendBlockChildrenResponse\> 

Calculates second minimum of each row/colmun and Appends these cell's column/row-labels as a new row/colmun 

#### parameters:
```typescript
(singleformula_options:{
	append : "newRow"  |  "newColumn",
	label?: string,
	not_apply_to? : Array<string>  |  Array<number>,
	ignore? : Array<string>  |  Array<number>,
	max?: ApiColor,
	min?: ApiColor,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **label**  : **string**<br>
 If not provided, calculation-method-name is used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  multiple () : Promise\<AppendBlockChildrenResponse\> 

Carries out multiple calculations. 

#### parameters:
```typescript
(formula_calls: Array<DirectedMultiFormulaOptions>,
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **formula_calls** : **Array\<DirectedMultiFormulaOptions\>**<br>
Array of the following params.

- @param **calls** : **Array\<BasicFormula\>**<br>
List of calculation-method-names.

- @param **append** : **"newRow" | "newColumn"**<br>
Append an each-columns-calculated-result row, or an each-rows-calculated-result colmun.

- @param *(optional)* **labels**  : **Array\<string\>**<br>
 If not provided, calculation-method-names are used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  multiple_col () : Promise\<AppendBlockChildrenResponse\> 

Carries out multiple calculations for each row and Appends the results as new colmuns.

#### parameters:
```typescript
(nondirectformula_options: {
	calls: BasicFormula[];
	labels?: string[]  |  undefined;
	not_apply_to?: string[]  |  number[]  |  undefined;
	ignore?: string[]  |  number[]  |  undefined;
	max?: ApiColor  |  undefined;
	min?: ApiColor  |  undefined;
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **calls** : **Array\<BasicFormula\>**<br>
List of calculation-method-names.

- @param *(optional)* **labels**  : **Array\<string\>**<br>
 If not provided, calculation-method-names are used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

### [async]  multimple_row () : Promise\<AppendBlockChildrenResponse\> 

Carries out multiple calculations for each column and Appends the results as new rows.

#### parameters:
```typescript
(nondirectformula_options: {
	calls: BasicFormula[];
	labels?: string[]  |  undefined;
	not_apply_to?: string[]  |  number[]  |  undefined;
	ignore?: string[]  |  number[]  |  undefined;
	max?: ApiColor  |  undefined;
	min?: ApiColor  |  undefined;
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **calls** : **Array\<BasicFormula\>**<br>
List of calculation-method-names.

- @param *(optional)* **labels**  : **Array\<string\>**<br>
 If not provided, calculation-method-names are used.

- @param *(optional)* **not_apply_to**  : **Array\<string\> | Array\<number\>**<br>
 List of labels or indices of rows/colmuns. If provided, calculation is not applied to listed rows/columns.

- @param *(optional)* **ignore**  : **Array\<string\> | Array\<number\>**<br>
List of labels or indices of rows/colmuns. If provided, calculation ignores the cells of listed rows/colmuns.

- @param *(optional)* **max**  : **ApiColor**<br>
 If proveided, the maximum-value text's color is changed to this.

- @param *(optional)* **min**  : **ApiColor**<br>
 If proveided, the minimum-value text's color is changed to this.

<br>

## convert

### [async]  to_list () : Promise\<AppendBlockChildrenResponse\>  

Converts table's rows to notion's bulleted lists.

#### parameters:
```typescript
(convertto_options: {
	label_separation_by?: string  |  undefined,
	cell_separation_by: string
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **cell_separation_by** : **string**<br>
Each row's cells are joined using this param as separation.

- @param *(optional)* **label_separation_by**  : **string**<br>
 If provided, each cell's text are joined with its column-label using this param as separation.

<br>

### [async]  from_list () : Promise\<AppendBlockChildrenResponse\> 

Converts notion's bulleted/numbered lists in the parent block to one table.

#### parameters:
```typescript
(convertfrom_options: {
	use_header_row: boolean,
	use_header_col: boolean,
	cell_separation_by: string,
	label_separation_by?: string,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **use_header_row** : **boolean**<br>


- @param **use_header_col** : **boolean**<br>


- @param **cell_separation_by** : **string**<br>
Each line-text is splited by this param

- @param *(optional)* **label_separation_by**  : **string**<br>
 If provided, each text is splited by this param to column-label and cell-text


<br>

## [async]  from_file() : Promise\<AppendBlockChildrenResponse\>

Converts csv or JSON data to one table.

#### parameters:
```typescript
(import_options: {
	path: string,
	use_header_row: boolean,
	use_header_colmun: boolean,
	jsonkey_as_cell?: boolean
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **path** : **string**<br>


- @param **use_header_row** : **boolean**<br>


- @param **use_header_colmun** : **boolean**<br>


- @param *(optional)* **jsonkey_as_cell**  : **boolean**<br>
 Whether or not JSON's top keys are used as the first cell of each row.

<br>



## [async]  join() : Promise\<AppendBlockChildrenResponse\>

Joins tables in the parent block to one table.

#### parameters:
```typescript
(joint_options? : {calls: Array<ManipulateSet>},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param *(optional)* **calls**  : **Array\<ManipulateSet\>**<br>
 List of {func: funtion name, options: function options}. If provided, listed funtions are carried out for the joined table. If carry out transposition, it must be the first or last.

<br>

## [async]  multi_processing() : Promise\<AppendBlockChildrenResponse\>

Carrys out multiple functions for one table.

#### parameters:
```typescript
(calls : Array<ManipulateSet>,
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **calls** : **Array\<ManipulateSet\>**<br>
List of {func: funtion name, options: function options}. Listed funtions are carried out for the table. Transposition must be the first or last.

<br>

## [async]  separate() : Promise\<AppendBlockChildrenResponse\>

Separates one table to two or more.

#### parameters:
```typescript
(separate_options:
	{ method: "by_blank"; options: null}  | 
	{ method: "by_number"; options: { number: number }}  | 
	{ method: "by_labels"; options: { row_labels: Array<string>}},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **method** : **"by_blank" | "by_labels" | "by_number"**<br>
How to separate the table. By blank rows, or specific row labels, or fixed number of rows.

- @param **options** : **null | {row_labels:Array\<string\>} | {number:number}**<br>
Details of separation. null, or list of row labels, or number of each new table's rows.

<br>

## [async]  sort() : Promise\<AppendBlockChildrenResponse\>

Sorts a table's rows based on the cells' values in the specified column.

#### parameters:
```typescript
(sort_options: {
	label: string,
	as_int?: boolean,
	high_to_low?: boolean,
},
basic_options?: {delete?:boolean, inspect?:boolean})
```
- @param **label** : **string**<br>
The column's label where the cells' values are used for sorting.

- @param *(optional)* **as_int** *(default: true)* : **boolean**<br>
 If false, the cells' values are not treated as number when compared.

- @param *(optional)* **high_to_low** *(default: true)* : **boolean**<br>
 If false, ascending sort is used.

<br>

## [async]  transpose() : Promise\<AppendBlockChildrenResponse\>

Transoposes a table.

#### parameters:
```typescript
(basic_options?: {delete?:boolean, inspect?:boolean})
```
