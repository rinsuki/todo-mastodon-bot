import WebSocketNode = require("ws")
import fetchNode from "node-fetch"
import { MASTODON_HOST, MASTODON_TOKEN, MASTODON_OWNER_TOKEN } from "./config"
import childProcess = require("child_process")
import path = require("path")
import axios from "axios"

const wsUrl = new URL("wss://" + MASTODON_HOST + "/api/v1/streaming/")
wsUrl.searchParams.set("access_token", MASTODON_TOKEN)
wsUrl.searchParams.set("stream", "user:notification")

const todoBotClient = axios.create({
    baseURL: `https://${MASTODON_HOST}`,
    headers: {
        Authorization: "Bearer " + MASTODON_TOKEN,
    }
})

const ownerClient = axios.create({
    baseURL: `https://${MASTODON_HOST}`,
    headers: {
        Authorization: "Bearer " + MASTODON_OWNER_TOKEN,
    }
})

function toot(text: string, visibility: string = "unlisted") {
    return todoBotClient.post("/api/v1/statuses", {
        status: text,
        visibility
    })
}

function reply(srcPost: {id: string, account: {acct: string}}, text: string) {
    return todoBotClient.post("/api/v1/statuses", {
        status: "@"+srcPost.account.acct+" "+text,
        in_reply_to_id: srcPost.id
    })
}

function connectStream() {
    const ws = new WebSocketNode(wsUrl.toString())
    ws.addEventListener("message", async ({data}) => {
        const dataParsed = JSON.parse(data)
        if (dataParsed.event !== "notification") return
        const notify = JSON.parse(dataParsed.payload)
        console.log(dataParsed, notify)
        switch (notify.type) {
            case "mention":
                if (!notify.account) return console.log("notify.account is null")
                if (!notify.status) return console.log("notify.status is null")
                const followCheckRes = await ownerClient.get<[{following: boolean}]>("/api/v1/accounts/relationships", {
                    params: {
                        "id[]": notify.status.account.id
                    }
                })
                if (followCheckRes.data.length < 1) {
                    return reply(notify.status, "なんかだめや")
                }
                if (followCheckRes.data[0].following === false && notify.account.acct !== "rinsuki") {
                    return reply(notify.status, "主がフォローしてないからダメ")
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
                    return reply(notify.status, "足したー")
                } else {
                    return reply(notify.status, "つかいかた: @.todo add TODOの内容(複数行OK)")
                }
                break;
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
