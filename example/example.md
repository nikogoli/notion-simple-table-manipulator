# Example


### 0. 準備

まず notion_sdk を import し、そのインスタンスを作成する。

次に notion に適当なページを作って callout を設置し、その **callout を右クリックし**メニューから “copy link to block”を選択して link を取得する

TableManipulator を import し、このリンクと notion_sdk のインスタンスから、TableManipulator のインスタンスを作成する
```typescript
import { Client } from "https://deno.land/x/notion_sdk/src/mod.ts";
import { TableManipulator } from "https://pax.deno.dev/nikogoli/notion-simple-table-manipulator/mod.ts"

const NOTION_TOKEN = "=~=~=~=~=~=~=~=~=~=~=~";
const notion = new Client({auth: NOTION_TOKEN});

const link = "https://www.notion.so/=================#~~~~~~~~~~~~~~~~~~~~~~~~~"
const simple_table = new TableManipulator({"client":notion, "url":url})
```


### 1. 外部ファイルから simple table を追加する

以下の内容を table_data.csv として保存する。

```csv
,HP,こうげき,ぼうぎょ,とくこう,とくぼう,すばやさ
緑1,45,49,49,65,65,45
赤1,39,52,43,60,50,65
青1,44,48,65,50,64,43
緑2,45,49,65,49,65,45
赤2,39,52,43,60,50,65
青2,50,65,64,44,48,43
```

このファイルから、親要素に simple table を追加してみる。

今回は Header row と Header column の両方を有効にする。

```typescript
await simple_table.from_file({ path:"./table_data.csv", set_header_row:true, set_header_colmun:true })
.then(response => console.log(response))
```

処理が正常に行われると、次のような simple table が追加される。




### 2. セルのテキストに色付け

各列のスターテスごとに最大値と最小値に色をつけてみる。

今回は列なので比較方向として列(`C`)を指定し、最大値には赤、最小値には青に変更する。

```typescript
await simple_table.apply_color.maxmin({direction:"C", max:"red", min:"blue"})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように更新される。



### 3. 行の並び替え

「ぼうぎょ」列を基準に行をソートしてみる。

今回は「数値として比較」+「上から下に大→小」を採用する。この場合はオプション指定を省略できる。

```typescript
await simple_table.sort({label:"ぼうぎょ"}) //= {label:"ぼうぎょ", as_int:true, high_to_low:true}
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように更新される



### 4. テーブルに数値計算を適用

右端に「(行の)合計」列を追加してみる。

列の追加なので `newColumn` を指定する。また、追加した列でも最大値と最小値に色をつけることができる。

```typescript
await simple_table.calculate_table.sum({append:"newColumn", label:"合計", max:"red", min:"blue"})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように更新される。




### 5. 各行に連番を追加 + 確認モード

左端に連番を追加してみる。

連番は文字列の形式を指定することが可能。その場合は、引数に与えた文字列中の`{num}`の部分が番号に置き換わる。

今回の変更は重要ではないので、メソッドの第2引数に `{inspect: true`} を与え、確認モードで実行してみる。

確認モードでは、操作した結果のテーブルのデータは作成されるが、notion には追加されない。

```typescript
await simple_table.add_number({label:"ぼうぎょの順位", text_format:"第{num}位"}, {inspect:true}))
```

処理が正常に行われると、コンソールには次のように出力される。右端に新しい列が追加されていることが確認できる。

```console
┌───────┬────────────────┬───────┬──────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────┐
│ (idx) │ ぼうぎょの順位 │       │ HP   │ こうげき │ ぼうぎょ │ とくこう │ とくぼう │ すばやさ │ 合計  │
├───────┼────────────────┼───────┼──────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────┤
│     0 │ "第1位"        │ "緑2" │ "45" │ "49"     │ "65"     │ "49"     │ "65"     │ "45"     │ "318" │
│     1 │ "第2位"        │ "青1" │ "44" │ "48"     │ "65"     │ "50"     │ "64"     │ "43"     │ "314" │
│     2 │ "第3位"        │ "青2" │ "50" │ "65"     │ "64"     │ "44"     │ "48"     │ "43"     │ "314" │
│     3 │ "第4位"        │ "緑1" │ "45" │ "49"     │ "49"     │ "65"     │ "65"     │ "45"     │ "318" │
│     4 │ "第5位"        │ "赤2" │ "39" │ "52"     │ "43"     │ "60"     │ "50"     │ "65"     │ "309" │
│     5 │ "第6位"        │ "赤1" │ "39" │ "52"     │ "43"     │ "60"     │ "50"     │ "65"     │ "309" │
└───────┴────────────────┴───────┴──────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────┘
```


### 6. テーブルの転置

テーブルを転置してみる。
    
今回の操作も重要ではないので、操作前のテーブルを残しておくことにする。

確認モードのように `{delete: false}` を引数に与えると、テーブルの操作・追加を行ったあと、元のテーブルの削除は実行されない
    
```typescript
await simple_table.transpose({delete:false})
.then(response => console.log(response))
```

処理が正常に行われると、次のような simple table が追加される。でも不要なのでこの新しいテーブルは削除する。




なお、インスタンスを作成する際に以下のように `keep_table = true` を与えておくと、常に `{delete: false}` が与えられた状態で操作を実行する。

```typescript
const simple_table = new TableManipulator({"client":notion, "url":url, "keep_table":true})
```

### 7. リストから行を追加する

以下のようなリストからテーブルに行を追加してみる。セルの区切りとして「、」を指定する。

- 青3、HP：53、こうげき：51、ぼうぎょ：53、とくこう：61、とくぼう：56、すばやさ：40、合計：
- 赤3、HP：44、こうげき：58、ぼうぎょ：44、とくこう：58、とくぼう：44、すばやさ：61、合計：
- 緑3、HP：55、こうげき：68、ぼうぎょ：64、とくこう：45、とくぼう：55、すばやさ：31、合計：


今回はラベルの内容も含まれているので、ラベルとセルの内容の区切りとして「：」を指定する

区切り「：」がないテキストの場合、ラベルは「""」として扱われる。逆に、区切りで終わるテキストは空白セルとして扱われる。

```typescript
await simple_table.add_row_from_list({cell_separation_by:"、", label_separation_by:"："})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように更新される


### 8. セルの数式を計算する

追加した行にも、列の合計を追加してみる
    
セルに、「row-summation」をしめす数式命令「=R_SUM」を追加する。

範囲指定には、計算範囲の最初のセルと最後のセルのインデックスを指定する。指定を省略した場合、先頭から数式命令のセルの手前までが範囲になる。

```
| 青3 | 53 | 51 | 53 | 61 | 56 | 40 | =R_SUM(1,7) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 赤3 | 44 | 58 | 44 | 58 | 44 | 61 | =R_SUM() |
| 緑3 | 55 | 68 | 64 | 45 | 55 | 31 | =R_SUM() |
```


```typescript
await simple_table.calculate_cell()
.then(response => console.log(response))
```

処理が正常に行われると、次のように数式命令が計算結果に置き換わる



### 9. 複数の処理を連続で行う

追加部分も含めて、最大値と最小値の色付けとソートを行ってみる。

さらに今回は、テーブルを追加する前に、「色付け」と「ソート」を連続して行う。

```typescript
await simple_table.multi_processing([
    {func:"apply_color", options:{direction:"C", max:"red", min:"blue"}},
    {func:"sort", options:{label:"合計"}}
])
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように変更される。色付けを行うと、以前のテキストの色は失われるので注意



### 10. テーブルを分割する

テーブルを別のテーブルに分割してみる。
    
今回は、3行ごとに分割を行うために、`by_number` を指定する。
    

```typescript
await simple_table.separate({method:"by_number",options:{number:3}})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように分割される。




### 11. テーブルの結合する

分割されたテーブルを1つに結合してみる。
    
さらに、結合結果のテーブルにおいて、「各列の平均値を計算した新しい行の追加」と「行方向での最大値と最小値の色付け」を行う

ただし、「合計」列の平均値については興味がないので、この部分は計算命令の対象から外したい。このような「適用しない部分」は、`not_apply_to` オプションにリストを渡すことで設定できる。

同様に、大きすぎる「合計」列の値は、最大・最小を判定する際にはこの部分は無視したい。このような「評価から除外する部分」は、`ignore` オプションにリストを渡すことで設定できる

```typescript
await simple_table.join({
    calls:[ {func:"calculate_table", options:[{formula:"C_AVERAGE",label:"平均", not_apply_to:["合計"], max:"red", min:"blue"}]},
            {func:"apply_color", options:{direction:"R", ignore:["合計"], max:"red", min:"blue"}}
        ]
})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のように結合される。なお、色付けにおいて「合計」列を無視したので、以前の色付けが残ってしまう。



### 12. テーブルをリストに変換する

最後に、テーブルをリストに変換してみる
    
各セルの値の区切りとして「,」を指定する。今回はラベルは各行には含めないことにして、ラベルの区切りは指定しない。
    

```typescript
await simple_table.convert.to_list({cell_separation_by:","})
.then(response => console.log(response))
```

処理が正常に行われると、simple table は次のような csv-like なリストに変換される


- ,HP,こうげき,ぼうぎょ,とくこう,とくぼう,すばやさ,合計
- 緑3,55,68,64,45,55,31,318
- 緑1,45,49,49,65,65,45,318
- 緑2,45,49,65,49,65,45,318
- 青3,53,51,53,61,56,40,314
- 青2,50,65,64,44,48,43,314
- 青1,44,48,65,50,64,43,314
- 赤3,44,58,44,58,44,61,309
- 赤1,39,52,43,60,50,65,309
- 赤2,39,52,43,60,50,65,309
- 平均,46.00,54.67,54.44,54.67,55.22,48.67,