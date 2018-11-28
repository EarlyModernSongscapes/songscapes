// This is a maintenance nodejs script. You may be able to run it on all TEI files at any time.
// 
// Use this script to add or replace <xi:include> elements that point to MEI documents from TEI documents.

const fs = require('fs')
const jsdom = require('jsdom')
const teiNS = 'http://www.tei-c.org/ns/1.0'
const xiNS = 'http://www.w3.org/2001/XInclude'

// Set files to skip over
const filesToSkip = []

fs.readdir( '../data/tei', function( err, files ) {
  if (err) {
    console.error( "Could not list the directory.", err )
    process.exit( 1 )
  }

  for (let file of files) {
    const source = file.split('.xml')[0]
    // skip file if required
    if (filesToSkip.indexOf(source) > -1) continue
    
    const teiString = fs.readFileSync(`../data/tei/${file}`, 'utf8')
      .replace(/xml:id/g, 'xmlid') // ugly hack for xml:id
    const teiDom = new jsdom.JSDOM(teiString, {contentType: 'text/xml'})
    const teiDoc = teiDom.window.document

    const notatedMusicEl = teiDoc.querySelector('notatedMusic')
    if (notatedMusicEl) {
      // Clear element
      while (notatedMusicEl.hasChildNodes()) {
        notatedMusicEl.removeChild(notatedMusicEl.lastChild)
      }
      const includeEl = teiDoc.createElementNS(xiNS, 'xi:include')
      includeEl.setAttribute('href', `../mei/${source}.mei`)
      notatedMusicEl.append(includeEl)

      // Write
      let output = `<?xml version="1.0" encoding="UTF-8"?>\n`
      for (let node of teiDoc.childNodes) {
        if (node.nodeType === 7) {
          output += (`<?${node.target} ${node.nodeValue}?>\n`)
        }
      }
      output += teiDoc.documentElement.outerHTML.replace(/xmlid/g, 'xml:id') // ugly hack for xml:id
      fs.writeFileSync(`../data/tei/${file}`, output)
    } else {
      // this TEI has no music and doesn't need to be rewritten
      continue
    }
  }
})
