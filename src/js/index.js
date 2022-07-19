import { initBindingPhraseGen } from './phrase.js'
import { Configure } from './configure.js'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

const flashButton = _('flashButton')
const connectButton = _('connectButton')
const vendorSelect = _('vendor')
const typeSelect = _('type')
const modelSelect = _('model')
const lblConnTo = _('lblConnTo')
const methodSelect = _('method')

let hardware = null
let device = null
let flasher = null
let binary = null
let term = null
let stlink = null

document.addEventListener('DOMContentLoaded', initialise, false)

function _ (el) {
  return document.getElementById(el)
}

function checkStatus (response) {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} - ${response.statusText}`)
  }
  return response
}

function initialise () {
  term = new Terminal({ cols: 80, rows: 40 })
  const fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(_('serial-monitor'))
  fitAddon.fit()

  initBindingPhraseGen()
  fetch('firmware/hardware/targets.json')
    .then(response => checkStatus(response) && response.json())
    .then(json => {
      hardware = json
      for (const k in json) {
        const opt = document.createElement('option')
        opt.value = k
        opt.innerHTML = json[k].name === undefined ? k : json[k].name
        vendorSelect.appendChild(opt)
      }
      vendorSelect.disabled = false
      setDisplay('.uart', 'none')
      setDisplay('.stlink', 'none')
      setDisplay('.wifi', 'none')
    })
}

function setDisplay (type, disp) {
  const elements = document.querySelectorAll(type)
  elements.forEach(element => {
    element.style.display = disp
  })
}

_('step-1').onclick = async () => {
  _('step-device').style.display = 'block'
  _('step-options').style.display = 'none'
  _('step-flash').style.display = 'none'

  _('step-1').classList.remove('done')
  _('step-1').classList.add('active')
  _('step-1').classList.add('editable')

  _('step-2').classList.remove('active')
  _('step-2').classList.remove('editable')
  _('step-2').classList.remove('done')

  _('step-3').classList.remove('active')
  _('step-3').classList.remove('editable')
  _('step-3').classList.remove('done')
}

_('step-2').onclick = async () => {
  if (_('step-flash').style.display === 'block') {
    _('step-options').style.display = 'block'
    _('step-flash').style.display = 'none'

    _('step-2').classList.remove('done')
    _('step-2').classList.add('active')
    _('step-2').classList.add('editable')

    _('step-3').classList.remove('active')
    _('step-3').classList.remove('editable')
    _('step-3').classList.remove('done')
  }
}

vendorSelect.onchange = async () => {
  _('tx_2400').disabled = true
  _('tx_900').disabled = true
  _('rx_2400').disabled = true
  _('rx_900').disabled = true
  for (const k in hardware[vendorSelect.value]) {
    if (_(k) !== null) _(k).disabled = false
  }
  typeSelect.disabled = false
  typeSelect.value = ''
  modelSelect.disabled = true
  modelSelect.value = ''
  _('device-next').disabled = true
}

typeSelect.onchange = async () => {
  modelSelect.options.length = 1
  for (const k in hardware[vendorSelect.value][typeSelect.value]) {
    const opt = document.createElement('option')
    opt.value = k
    opt.innerHTML = hardware[vendorSelect.value][typeSelect.value][k].product_name
    modelSelect.appendChild(opt)
  }
  modelSelect.disabled = false
  _('device-next').disabled = true
}

modelSelect.onchange = async () => {
  _('device-next').disabled = false
}

_('device-next').onclick = async () => {
  setDisplay('.tx_2400', 'none')
  setDisplay('.rx_2400', 'none')
  setDisplay('.tx_900', 'none')
  setDisplay('.rx_900', 'none')
  setDisplay('.esp8285', 'none')
  setDisplay('.esp32', 'none')
  setDisplay('.stm32', 'none')
  setDisplay('.feature-fan', 'none')
  setDisplay('.feature-unlock-higher-power', 'none')
  setDisplay('.feature-sbus-uart', 'none')
  setDisplay('.feature-buzzer', 'none')

  const features = hardware[vendorSelect.value][typeSelect.value][modelSelect.value].features
  if (features) features.forEach(f => setDisplay('.feature-' + f, 'block'))

  _('fcclbt').value = 'FCC'
  setDisplay('.' + typeSelect.value, 'block')
  setDisplay('.' + hardware[vendorSelect.value][typeSelect.value][modelSelect.value].platform, 'block')

  _('uart').disabled = true
  _('betaflight').disabled = true
  _('etx').disabled = true
  _('wifi').disabled = true
  _('stlink').disabled = true
  hardware[vendorSelect.value][typeSelect.value][modelSelect.value].upload_methods.forEach((k) => { _(k).disabled = false })

  _('step-device').style.display = 'none'
  _('step-2').classList.add('active')
  _('step-2').classList.add('editable')
  _('step-1').classList.add('done')
  _('step-1').classList.remove('editable')
  _('step-options').style.display = 'block'
}

_('method').onchange = async () => {
  _('options-next').disabled = false
  if (_('method').value === 'download') {
    _('options-next').value = 'Download'
  } else {
    _('options-next').value = 'Next'
  }
}

const getSettings = async (deviceType) => {
  const config = hardware[vendorSelect.value][typeSelect.value][modelSelect.value]
  const firmwareUrl = 'firmware/' + _('fcclbt').value + '/' + config.firmware + '/firmware.bin'
  const options = {}

  if (_('uid').value !== '') {
    options.uid = _('uid').value.split(',').map((element) => {
      return Number(element)
    })
  }
  if (config.platform !== 'stm32') {
    options['wifi-on-interval'] = +_('wifi-on-interval').value
    options['wifi-ssid'] = _('wifi-ssid').value
    options['wifi-password'] = _('wifi-password').value
  }
  if (deviceType === 'RX') {
    options['rcvr-uart-baud'] = +_('rcvr-uart-baud').value
    options['rcvr-invert-tx'] = _('rcvr-invert-tx').checked
    options['lock-on-first-connection'] = _('lock-on-first-connection').checked
  } else {
    options['tlm-interval'] = +_('tlm-interval').value
    options['fan-runtime'] = +_('fan-runtime').value
    options['uart-inverted'] = _('uart-inverted').checked
    options['unlock-higher-power'] = _('unlock-higher-power').checked
  }
  if (typeSelect.value === 'rx_900' || typeSelect.value === 'tx_900') {
    options.domain = +_('domain').value
  }
  if (config.features !== undefined && config.features.indexOf('buzzer') !== -1) {
    const beeptype = Number(_('melody-type').value)
    options.beeptype = beeptype > 2 ? 2 : beeptype

    options.melody = await import('./melody.js')
      .then((_) => {
        if (beeptype === 2) {
          return _.MelodyParser.parseToArray('A4 20 B4 20|60|0')
        } else if (beeptype === 3) {
          return _.MelodyParser.parseToArray('E5 40 E5 40 C5 120 E5 40 G5 22 G4 21|20|0')
        } else if (beeptype === 4) {
          return _.MelodyParser.parseToArray(_('melody').value)
        } else {
          return []
        }
      })
  }
  return { config, firmwareUrl, options }
}

const connectUART = async () => {
  const deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX'
  const radioType = typeSelect.value.endsWith('_900') ? 'sx127x' : 'sx128x'
  await getSettings(deviceType)
    .then(({ config, firmwareUrl, options }) => {
      Promise
        .all([
          navigator.serial.requestPort()
            .then(d => {
              device = d
              device.addEventListener('disconnect', async (e) => {
                device = null
                term.clear()
                flashButton.style.display = 'none'
                connectButton.style.display = 'block'
              })
              connectButton.style.display = 'none'
            }),
          Configure.download(deviceType, radioType, config, firmwareUrl, options)
            .then(b => {
              binary = b
            })
        ])
        .then(_ => {
          const method = methodSelect.value
          let fp
          if (config.platform === 'stm32') {
            fp = import('./xmodem.js')
              .then(m => new m.XmodemFlasher(device, deviceType, method, config, options, firmwareUrl, term))
          } else {
            fp = import('./espflasher.js')
              .then(m => new m.ESPFlasher(device, deviceType, method, config, options, firmwareUrl, term))
          }
          fp
            .then(f => {
              flasher = f
              return f.connect()
            })
            .then(chip => {
              lblConnTo.innerHTML = 'Connected to device: ' + chip
              flashButton.style.display = 'initial'
            })
            .catch(() => {
              lblConnTo.innerHTML = 'Failed to connect to device, restart device and try again'
              flashButton.style.display = 'none'
              connectButton.style.display = 'block'
            })
        })
        .catch(() => {
          lblConnTo.innerHTML = 'No device selected'
          flashButton.style.display = 'none'
          connectButton.style.display = 'block'
        })
    })
}

const connectSTLink = async () => {
  const deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX'
  const radioType = typeSelect.value.endsWith('_900') ? 'sx127x' : 'sx128x'

  await Promise
    .all([
      import('./stlink.js')
        .then(_ => new _.STLink(term)),
      getSettings(deviceType)
    ])
    .then(([_stlink, { config, firmwareUrl, options }]) =>
      Promise
        .all([
          _stlink.connect(config, firmwareUrl, options, e => {
            term.clear()
            flashButton.style.display = 'none'
            connectButton.style.display = 'block'
          })
            .then(version => {
              lblConnTo.innerHTML = 'Connected to device: ' + version
              stlink = _stlink
            })
            .catch((e) => {
              lblConnTo.innerHTML = 'Not connected'
              flashButton.style.display = 'none'
              connectButton.style.display = 'block'
              return Promise.reject(e)
            }),
          Configure.download(deviceType, radioType, config, firmwareUrl, options)
        ])
        .then(([_, _bin]) => {
          connectButton.style.display = 'none'
          flashButton.style.display = 'initial'
          binary = _bin
        })
        .catch(() => {})
    )
}

const connectWifi = async () => {
  function check (response) {
    if (!response.ok) {
      throw Promise.reject(new Error('Failed to connect to device'))
    }
    return response.json()
  }
  const deviceType = typeSelect.value.substring(0, 2)
  await Promise.any([
    fetch('http://10.0.0.1/target')
      .then(response => check(response))
      .then(_ => ['http://10.0.0.1/', _]),
    fetch(`http://elrs_${deviceType}/target`)
      .then(response => check(response))
      .then(_ => [`http://elrs_${deviceType}/`, _]),
    fetch(`http://elrs_${deviceType}.local/target`)
      .then(response => check(response))
      .then(_ => [`http://elrs_${deviceType}/`, _])
  ]).then(([url, response]) => {
    lblConnTo.innerHTML = 'Connected to: ' + url
    _('product_name').innerHTML = 'Product name: ' + response.product_name
    _('target').innerHTML = 'Target firmware: ' + response.target
    _('version').innerHTML = 'Version: ' + response.version
    flashButton.style.display = 'block'
  }).catch(reason => {
    lblConnTo.innerHTML = 'No device found'
    console.log(reason)
  })
}

_('options-next').onclick = async () => {
  const method = _('method').value
  if (method === 'download') {
    await downloadFirmware()
  } else {
    _('step-options').style.display = 'none'
    _('step-3').classList.add('active')
    _('step-3').classList.add('editable')
    _('step-2').classList.add('done')
    _('step-2').classList.remove('editable')
    _('step-flash').style.display = 'block'

    setDisplay('.' + method, 'block')

    if (method === 'wifi') {
      connectButton.onclick = connectWifi
    } else if (method === 'stlink') {
      connectButton.onclick = connectSTLink
    } else {
      connectButton.onclick = connectUART
    }
    await connectButton.onclick()
  }
}

flashButton.onclick = async () => {
  const method = _('method').value
  if (method === 'wifi') {
    //
  } else if (flasher !== null) await flasher.flash(binary, _('erase-flash').checked)
  else await stlink.flash(binary, _('flash-bootloader').checked)
}

const downloadFirmware = async () => {
  const deviceType = typeSelect.value.startsWith('tx_') ? 'TX' : 'RX'
  const radioType = typeSelect.value.endsWith('_900') ? 'sx127x' : 'sx128x'

  await getSettings(deviceType)
    .then(({ config, firmwareUrl, options }) => {
      return Promise.all([
        config,
        Configure.download(deviceType, radioType, config, firmwareUrl, options)
      ])
    })
    .then(([config, binary]) => {
      let file = null
      const makeFile = function () {
        let bin
        if (config.platform === 'stm32') {
          bin = binary.buffer
        } else {
          bin = binary[binary.length - 1].data.buffer
        }
        const data = new Blob([bin], { type: 'application/octet-stream' })
        if (file !== null) {
          window.URL.revokeObjectURL(file)
        }
        file = window.URL.createObjectURL(data)
        return file
      }

      const link = document.createElement('a')
      link.setAttribute('download', 'firmware.bin')
      link.href = makeFile()
      document.body.appendChild(link)

      // wait for the link to be added to the document
      window.requestAnimationFrame(function () {
        const event = new MouseEvent('click')
        link.dispatchEvent(event)
        document.body.removeChild(link)
      })
    })
}
