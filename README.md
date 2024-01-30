# dagens-lunsj

A slack-bot app for choosing lunch-meal based on message-thread replies

Scheduling channel check...
Firing up dagens-lunsj server..
Server listening on port 3000
event: {
client_msg_id: '82f82f80-7b7e-45f7-a232-46ab75bf4a6b',
type: 'app_mention',
text: '<@U066S2MK458> heyyy',
user: 'U05B6DGB6KS',
ts: '1700696651.555639',
blocks: [ { type: 'rich_text', block_id: 'uJniw', elements: [Array] } ],
team: 'TN7K087FE',
channel: 'C066BGLKAKZ',
event_ts: '1700696651.555639'
}
App mention message-text:
<@U066S2MK458> heyyy
foodToBlock: sushi in channel: C066BGLKAKZ
getBlockedFoodsForToday filePath: /opt/bitnami/apache/htdocs/dagens-lunsj/data/blockedFood
s/C066BGLKAKZ.json
unhandled Rejection at: Promise {
<rejected> TypeError: foodToBeBlocked is not iterable
at blockFoodForToday (file:///opt/bitnami/apache/htdocs/dagens-lunsj/helpers.js:383:6 4)
at file:///opt/bitnami/apache/htdocs/dagens-lunsj/index.js:173:34
at Layer.handle [as handle_request] (/opt/bitnami/apache/htdocs/dagens-lunsj/node_mod
ules/express/lib/router/layer.js:95:5)
at next (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/express/lib/router/rout
e.js:144:13)
at Route.dispatch (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/express/lib/r
outer/route.js:114:3)
at Layer.handle [as handle_request] (/opt/bitnami/apache/htdocs/dagens-lunsj/node_mod
ules/express/lib/router/layer.js:95:5)
at /opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/express/lib/router/index.js:2
84:15
at Function.process_params (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/expr
ess/lib/router/index.js:346:12)
at next (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/express/lib/router/inde
x.js:280:10)
at /opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/body-parser/lib/read.js:137:5
} reason: TypeError: foodToBeBlocked is not iterable
at blockFoodForToday (file:///opt/bitnami/apache/htdocs/dagens-lunsj/helpers.js:383:64)
at file:///opt/bitnami/apache/htdocs/dagens-lunsj/index.js:173:34
at Layer.handle [as handle_request] (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modul
es/express/lib/router/layer.js:95:5)
at next (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/express/lib/router/route.
js:144:13)
at Route.dispatch (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/express/lib/rou
ter/route.js:114:3)
at Layer.handle [as handle_request] (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modul
es/express/lib/router/layer.js:95:5)
at /opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/express/lib/router/index.js:284
:15
at Function.process_params (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/expres
s/lib/router/index.js:346:12)
at next (/opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/express/lib/router/index.
js:280:10)
at /opt/bitnami/apache/htdocs/dagens-lunsj/node_modules/body-parser/lib/read.js:137:5
^C
