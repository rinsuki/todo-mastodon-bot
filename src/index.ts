import WebSocketNode = require("ws")
import fetchNode from "node-fetch"
import { MASTODON_HOST, MASTODON_TOKEN } from "./config"
import childProcess = require("child_process")
import path = require("path")

const wsUrl = new URL("wss://" + MASTODON_HOST + "/api/v1/streaming/")
wsUrl.searchParams.set("access_token", MASTODON_TOKEN)
wsUrl.searchParams.set("stream", "user:notification")

function toot(text: string, visibility: string = "unlisted") {
    return fetchNode("https://"+MASTODON_HOST+"/api/v1/statuses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer "+MASTODON_TOKEN,
        },
        body: JSON.stringify({
            status: text,
            visibility
        })
    })
}

function reply(srcPost: {id: string, account: {acct: string}}, text: string) {
    return fetchNode("https://"+MASTODON_HOST+"/api/v1/statuses", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer "+MASTODON_TOKEN,
        },
        body: JSON.stringify({
            status: "@"+srcPost.account.acct+" "+text,
            in_reply_to_id: srcPost.id
        })
    })
}

function connectStream() {
    const ws = new WebSocketNode(wsUrl.toString())
    ws.addEventListener("message", ({data}) => {
        const dataParsed = JSON.parse(data)
        if (dataParsed.event !== "notification") return
        const notify = JSON.parse(dataParsed.payload)
        console.log(dataParsed, notify)
        switch (notify.type) {
            case "mention":
                if (!notify.account) return console.log("notify.account is null")
                if (!notify.status) return console.log("notify.status is null")
                if (notify.status.account.acct !== "rinsuki") {
                    console.log("notify.status.account is not rinsuki", notify.status.account.acct)
                    return reply(notify.status, "誰やお前")
                }
                const text = notify.status.content
                    .replace(/<br.+?>/g, "\n")
                    .replace(/<\/p><p>/g, "\n\n")
                    .replace(/<.+?>/g, "")
                const regAdd = /^@todo add (.+)(\n(((.+)\n?)+))?$/.exec(text)
                if (regAdd) {
                    console.log(regAdd)
                    childProcess.spawnSync("osascript", [
                        path.join(__dirname, "../osaScripts/add.js"),
                        JSON.stringify({
                            name: regAdd[1],
                            body: regAdd[3],
                        })
                    ])
                }
                break;
            case "follow":
                if (!notify.account) return console.log("notify.account is null")
                return toot("@"+notify.account.acct+" こんなアカウントをフォローするなんて、物好きどすなぁ〜")
            default:
                console.log("notify.type is unknown", notify.type)
        }
    })
    ws.addEventListener("close", () => {
        console.log("closed")
        setTimeout(connectStream, 5)
    })
}

connectStream()
