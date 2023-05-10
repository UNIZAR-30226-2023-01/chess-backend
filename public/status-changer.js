function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getEvent(text) {
  return text.match(/event\(([^ ]+)\)/)[1]
}


var sections = document.getElementsByClassName('sc-eCApnc')

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
        const event = getEvent(desc.innerText)
        // Add to map
        map.set(code.innerText.replace(' ', ''), event)
        // Change text inside button
        desc.innerText = desc.innerText.replace(`event(${event})`, '');
        code.innerText = event + ' '
      } catch (error) {}
    }

    const description = section.getElementsByClassName('sc-iJCRrE sc-ciSkZP').item(0)
    let text
    if (description) text = description.firstChild
    try {
      const event = getEvent(text.innerText)
      text.innerText = text.innerText.replace(`event(${event})`, '');
      map.set('Payload', event)

      const webhook = section.getElementsByClassName('sc-bqGGPW').item(0)
      webhook.innerText = event
    } catch (error) {}

    const tabList = section.querySelectorAll('[role="tab"]')
    for (const tab of tabList) {
      const event = map.get(tab.innerText)
      if (event) {
          tab.innerText = event
      }
    }
  }

  // Change Webhooks tags for Event tags
  /*
  const webhooks = document.getElementsByClassName('sc-bqGGPW')
  for (const webhook of webhooks) {
    webhook.innerText = 'Event'
  }
  */

  // Remove Redocly Footer
  const redoclyFooter = document.getElementsByClassName('sc-kYPZxB')[0];
  redoclyFooter.hidden = true;

  // Remove Redocly Sidebar
  const redoclySidebar = document.getElementsByClassName('menu-content')[0]
  redoclySidebar.style.cssText = 'padding: 25px 0 100px 0; position: sticky; top: 0; z-index: 50;'
})
