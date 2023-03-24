var sections = document.getElementsByClassName('sc-eCApnc')

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElements() {
  while (sections.length == 0) {
    await sleep(100)
    sections = document.getElementsByClassName('sc-eCApnc')
  }
}

waitForElements().then(() => {
  // Change Status Codes if an event is specified
  for (const section of sections) {
    const map = new Map()
    const buttons = section.getElementsByClassName('sc-htmcrh')
    for (const button of buttons) {
      const code = button.getElementsByClassName('sc-fWWYYk').item(0)
      const desc = button.getElementsByClassName('sc-jcwpoC').item(0)
      try {
        const event = desc.innerText.match(/event\((.+)\)/)[1]
        // Add to map
        map.set(code.innerText.replace(' ', ''), event)
        // Change text inside button
        desc.innerText = desc.innerText.replace(`event(${event})`, '');
        code.innerText = event + ' '
      } catch (error) {}
    }

    const tabList = section.querySelectorAll('[role="tab"]')
    for (const tab of tabList) {
      const event = map.get(tab.innerText)
      if (event) {
          tab.innerText = event
      }
    }
  }

  // Change Webhooks tags for Event tags
  const webhooks = document.getElementsByClassName('sc-bqGGPW')
  for (const webhook of webhooks) {
    webhook.innerText = 'Event'
  }

  var redoclySidebar = document.getElementsByClassName('sc-kYPZxB')[0];
  redoclySidebar.hidden = true;
})
