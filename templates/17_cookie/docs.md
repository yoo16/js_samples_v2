`17_cookie` は、`JavaScript` から `Cookie` を読み書きする基本操作と、`Cookie` を使ったテーマ切り替え（ライト/ダーク）を題材にした教材です。`Cookie` がどのようなものか、`Web` システムでどう使われるかを理解したうえで、実際の操作方法を見ていきます。

## Cookie とは

`Cookie` は、`Web` サーバーがブラウザに保存させる小さなデータです。**一度保存すると、同じサイトへのリクエストのたびにブラウザが自動的に送信します。**

`HTTP` はリクエストごとに独立していて、前回のやり取りを覚えていません。この性質を「ステートレス」と呼びます。`Cookie` は、この性質を補って「前回の状態」を覚えておくための仕組みです。

### Cookie の特徴

| 特徴 | 内容 |
| ---- | ---- |
| 自動送信 | 保存されたサイトへのリクエストにブラウザが自動で付ける |
| 有効期限 | 期限を指定でき、期限が切れると自動的に削除される |
| サイズ制限 | 1つのCookieや1ドメインあたりの容量に上限がある |
| JSからの操作 | HttpOnlyを付けていなければJavaScriptから読み書きできる |

### Cookie の設定項目

`Cookie` を保存するときは、値だけでなく次のような設定項目を一緒に指定できます。

| 設定項目 | 内容 |
| ---- | ---- |
| path | Cookieを送信する対象のパス範囲 |
| expires | Cookieの有効期限を日時で指定する |
| max-age | Cookieの有効期限を秒数で指定する |
| SameSite | 他サイトからのリクエストにCookieを送るかどうかを制御する |
| Secure | HTTPS通信のときだけCookieを送信するようにする |
| HttpOnly | JavaScriptからのCookieの読み書きを禁止する |

### Web システムでの利用例

| 用途 | 内容 |
| ---- | ---- |
| ログイン状態の保持 | セッションIDを保存し、ログイン中のユーザーを識別する |
| テーマ・言語設定 | ダークモードや表示言語などユーザーごとの好みを保存する |
| ショッピングカート | 未ログインの状態でもカートの中身を保持する |
| アクセス解析 | 訪問回数やアクセス経路を記録し、行動を分析する |
| 広告・バナーの表示制御 | 一度閉じた広告を、一定期間だけ再表示しないようにする |

> ログイン情報のような重要なデータは、`JavaScript` から読み書きできない `HttpOnly` 属性を付けて保存するのが基本です。

## JavaScript での Cookie 操作

`JavaScript` では `document.cookie` を使って `Cookie` を読み書きします。ただし `document.cookie` は配列やオブジェクトではなく、**すべての Cookie が1本の文字列としてまとまっている**点に注意します。

### document.cookie の使い方

| 操作 | 書き方 | 内容 |
| ---- | ---- | ---- |
| 読み取り | document.cookie | 保存されているすべてのCookieを1本の文字列で取得する |
| 書き込み（追加） | document.cookie = "key=value" | 指定したキーのCookieを1件追加・上書きする |
| 削除 | document.cookie = "key=; expires=過去の日時" | 有効期限を過去にして該当キーのCookieを消す |

### この教材で使う関数一覧

| 関数 | 役割 | 主な引数 |
| ---- | ---- | ---- |
| setCookie | Cookieを1件保存する | key, value, mode, expires, maxAge |
| getCookie | 指定したキーのCookieの値を取得する | key |
| deleteCookie | 指定したキーのCookieを削除する | key |
| deleteAllCookies | 保存されているCookieをすべて削除する | なし |

### Cookie の保存

`document.cookie` に `キー=値` の形式で代入すると、`Cookie` が1件追加されます。`expires`（日時）や `max-age`（秒数）を付けると有効期限を指定できます。

```js
function setCookie(key, value, mode, expires, maxAge) {
    let cookieStr = `${key}=${value}; path=/; SameSite=Lax`;

    if (mode === "expires" && expires) {
        const dateString = new Date(expires).toUTCString();
        cookieStr += `; expires=${dateString}`;
    }
    if (mode === "max-age" && maxAge) {
        cookieStr += `; max-age=${maxAge}`;
    }

    document.cookie = cookieStr;
}
```

> `path=/` を指定すると、サイト内のどのページからも同じ `Cookie` を参照できます。省略すると、保存したページと同じ階層でしか参照できません。

### Cookie の取得

`document.cookie` は `"key1=value1; key2=value2"` のような1本の文字列で返ってくるため、`;` で分割してから目的の `Cookie` を探します。

```js
function getCookie(key) {
    const cookies = document.cookie.split("; ");
    for (const cookie of cookies) {
        const [_key, value] = cookie.split("=");
        if (_key === key) {
            return decodeURIComponent(value);
        }
    }
    return null;
}
```

### Cookie の削除

`Cookie` には削除専用の命令がありません。**同じ名前の `Cookie` を、有効期限を過去の日時にして上書きすることで削除します。**

```js
function deleteCookie(key) {
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}
```

すべての `Cookie` を削除したい場合は、`document.cookie` を分割してキーを1つずつ取り出し、`deleteCookie()` を繰り返し呼び出します。

### 実践例：広告バナーの表示制御

`Web` サイトでよくある「閉じるとしばらく表示されない広告バナー」も、これまでの `setCookie()` / `getCookie()` / `deleteCookie()` の組み合わせだけで実装できます。

| 処理 | 内容 |
| ---- | ---- |
| 初期表示 | Cookieに閉じた記録があれば、最初からバナーを非表示にする |
| 閉じるボタン | 7日間分のmax-ageを付けてCookieに記録し、バナーを非表示にする |
| リセットボタン | Cookieを削除し、次回から再びバナーを表示できるようにする |

```js
const AD_KEY = "ad_closed";
const adBanner = document.getElementById("adBanner");

// 前回閉じていれば（Cookieが残っていれば）、最初から広告を非表示にする
if (getCookie(AD_KEY)) {
    adBanner.classList.add("hidden");
}

// 閉じるボタン：7日間表示しないようCookieに記録する
document.getElementById("adCloseBtn").addEventListener("click", () => {
    setCookie(AD_KEY, "1", "max-age", null, 60 * 60 * 24 * 7);
    adBanner.classList.add("hidden");
});

// リセットボタン：Cookieを削除して、次回から再び広告を表示する
document.getElementById("adResetBtn").addEventListener("click", () => {
    deleteCookie(AD_KEY);
    adBanner.classList.remove("hidden");
});
```

> 表示・非表示そのものは `classList` の操作だけで完結しますが、**その状態を次回アクセス時にも覚えておくためにCookieを使っています。**

## テーマ切り替えプログラムの解説

`17_cookie` には、選択したテーマ（ライト/ダーク）を `Cookie` に保存し、次回アクセス時にも同じテーマを復元する仕組みが含まれています。

### テーマ関連の関数一覧

| 関数 | 役割 |
| ---- | ---- |
| applyTheme | 指定したテーマを画面に反映し、必要ならCookieに保存する |
| toggleTheme | 現在のテーマをライト/ダークで反転させて適用する |
| loadTheme | Cookieに保存されたテーマ、またはOSの設定から初期テーマを決める |

### Cookie を使ったテーマの保存

テーマボタンを押すと、現在の状態を反転させてから `applyTheme()` を呼び出し、`html` 要素へ `dark` クラスを付け外しします。ユーザーが明示的に切り替えた場合だけ、`setCookie()` でテーマを `Cookie` に保存します。

```js
function applyTheme(value, save = false) {
    theme = value;
    root.classList.toggle("dark", theme === "dark");

    if (save) {
        setCookie(THEME_KEY, theme);
    }
}

function toggleTheme() {
    const next = (theme === "dark") ? "light" : "dark";
    applyTheme(next, true);
}
```

### OS のテーマ設定との連動

ページ読み込み時は、`Cookie` に保存されたテーマがあればそれを使い、無ければ **OS 側のダークモード設定**（`prefers-color-scheme`）に合わせます。

```js
function loadTheme() {
    const saved = getCookie(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
```

### matchMedia に関するAPI

| API | 内容 |
| ---- | ---- |
| matchMedia(クエリ) | 指定したメディアクエリの条件に一致するかを調べるオブジェクトを返す |
| .matches | クエリの条件に現在一致しているかどうかの真偽値 |
| changeイベント | OS側の設定変更などでクエリの一致状態が変わったときに発生する |

さらに、`matchMedia()` の `change` イベントを監視し、`Cookie` に保存済みのテーマが無い場合のみ、OSの設定変更に合わせて自動で切り替えます。

```js
const media = matchMedia("(prefers-color-scheme: dark)");
media.addEventListener("change", (e) => {
    if (!getCookie(THEME_KEY)) {
        applyTheme(e.matches ? "dark" : "light");
    }
});
```

### CSS 変数によるテーマ切り替え

配色は `CSS` の変数（カスタムプロパティ）としてまとめてあり、`html` 要素に `dark` クラスが付いているかどうかで変数の値だけを切り替えます。**個別の要素に色を指定するのではなく、変数を差し替える方式なので、テーマの追加・調整がしやすくなります。**

### 主な CSS 変数

| 変数 | 内容 |
| ---- | ---- |
| --page-bg | ページ全体の背景色 |
| --page-text | ページ全体の文字色 |
| --muted-text | ラベルなど控えめな文字色 |
| --surface-bg | カードなど表面要素の背景色 |
| --surface-border | カードなど表面要素の枠線色 |
| --control-bg | 入力欄やボタンの背景色 |
| --control-text | 入力欄やボタンの文字色 |
| --control-border | 入力欄やボタンの枠線色 |
| --button-hover | ボタンにマウスを重ねたときの背景色 |
| --code-bg | Cookie表示欄など、コード風表示の背景色 |

```css
:root {
    --page-bg: #f9fafb;
    --page-text: #111827;
}

html.dark {
    --page-bg: #111827;
    --page-text: #f9fafb;
}

body {
    background-color: var(--page-bg);
    color: var(--page-text);
}
```

## まとめ

| 項目 | 内容 |
| ---- | ---- |
| Cookie | ブラウザに保存され、同じサイトへのリクエストで自動送信される小さなデータ |
| document.cookie | JavaScriptからCookieを読み書きするためのプロパティ。文字列としてまとめて扱う |
| Cookieの保存 | キー=値の形式で代入し、expiresやmax-ageで有効期限を指定する |
| Cookieの削除 | 同じキーのCookieを、有効期限を過去にして上書きする |
| 広告バナーの表示制御 | 閉じた状態をmax-age付きCookieに記録し、一定期間だけ再表示しない実践例 |
| prefers-color-scheme | OS側のダークモード設定を検知するCSS/JavaScriptの仕組み |
| CSS変数 | 色をまとめて管理し、クラスの切り替えだけでテーマを変更できる仕組み |
