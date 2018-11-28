// This is a one-off nodejs script. You may be able to run it on new data.
// 
// Use this script to generate collation files based on files in /data/tei and /data/mei

const fs = require('fs')
const jsdom = require('jsdom')
const teiNS = 'http://www.tei-c.org/ns/1.0'
const meiNS = 'http://www.music-encoding.org/ns/mei'

// Set works to skip over
const worksToSkip = ['Come_heavy_Souls,_oppressed_with_the_weight', 'Theseus,_O_Theseus,_hark!', 'Venus,_redress_a_wrong_that\'s_done']

// Load collation template
const collationTpl = fs.readFileSync('collation_tpl.xml', 'utf8')
const collationDom = new jsdom.JSDOM(collationTpl, {contentType: 'text/xml'})
const collationDoc = collationDom.window.document

fs.readdir( '../data/tei', function( err, files ) {
  if (err) {
    console.error( "Could not list the directory.", err )
    process.exit( 1 )
  }

  let curWork
  let curCollationDoc

  for (let [i, file] of files.entries()) {
    const work = file.replace(/-[^\.-]+\.xml$/, '')
    // skip work if required
    if (worksToSkip.indexOf(work) > -1) continue
    const source = file.match(/-([^\.-]+)\.xml$/)[1]
    if (!curWork || work !== curWork) {
      curWork = work
      curCollationDoc = collationDoc.documentElement.cloneNode(true)
      curCollationDoc.querySelector('titleStmt > title > title').textContent = work.replace(/_/g, ' ')
    }
    
    const workId = work.split('_').map((w) => w[0].toLowerCase()).join('')

    // Create witness element
    const witnessEl = collationDoc.createElementNS(teiNS, 'witness')
    witnessEl.setAttribute('xmlid', source)
    witnessEl.textContent = `TEI Digital Edition located at `
    const ptrEl = collationDoc.createElementNS(teiNS,'ptr')
    ptrEl.setAttribute('target',
      `https://ems.digitalscholarship.utsc.utoronto.ca/islandora/object/ems%3A${workId}/datastream/TEI-${source}/view`)
    witnessEl.appendChild(ptrEl)
    curCollationDoc.querySelector('listWit').appendChild(witnessEl)

    // Create MEI source element
    const sourceEl = collationDoc.createElementNS(meiNS, 'mei:source')
    sourceEl.setAttribute('xmlid', `M-${source}`)
    sourceEl.setAttribute('target',
      `https://ems.digitalscholarship.utsc.utoronto.ca/islandora/object/ems%3A${workId}/datastream/MEI-${source}/view`)
    curCollationDoc.getElementsByTagName('mei:sourceDesc')[0].appendChild(sourceEl)

    // Write out if this is the last source (file) for this work
    if (!files[i + 1]) {
      writeCollation(curCollationDoc, work)
    } else if (files[i + 1].replace(/-[^\.-]+\.xml$/, '') !== curWork) {
      writeCollation(curCollationDoc, work)
    }
  }
})

function writeCollation(doc, work) {
  let output = `<?xml version="1.0" encoding="UTF-8"?>\n`
  // Get processing instructions from template
  for (let node of collationDoc.childNodes) {
    if (node.nodeType === 7) {
      output += (`<?${node.target} ${node.nodeValue}?>\n`)
    }
  }
  output += doc.outerHTML.replace(/xmlid/g, 'xml:id') // ugly hack for xml:id
  fs.writeFileSync(`../data/collations/${work}.xml`, output)
}