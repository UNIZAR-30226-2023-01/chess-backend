var collection = document.getElementsByClassName("sc-htmcrh jcAmZH")

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function wait () {
    while (collection.length == 0) {
        await sleep(100)
        collection = document.getElementsByClassName("sc-htmcrh jcAmZH")
    }
}

wait().then(() => {
    for (let i = 0; i < collection.length; i++) {
        let e = collection[i]
        let text = e.childNodes.item(2).children[0].innerText
        let code = e.childNodes.item(1).firstChild.nodeValue
        try {
            let event = text.match(/event\((.+)\)/)[1]
            console.log(event)
            console.log(code)
            e.childNodes.item(1).firstChild.nodeValue = event
        } catch (error) {}
        
        console.log(e)
    }
})


