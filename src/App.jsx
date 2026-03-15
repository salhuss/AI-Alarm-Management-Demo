import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  // Simulation state
  const [activeScenario, setActiveScenario] = useState(null)
  const [showPopup, setShowPopup] = useState(false)
  const [popupContent, setPopupContent] = useState(null)
  const [currentTransmitterType, setCurrentTransmitterType] = useState('level') // 'level', 'pressure', 'flow'

  // Tag values
  const [h2sLevel, setH2sLevel] = useState(2) // XTGD-5401-001
  const [flowLinePressure, setFlowLinePressure] = useState(52) // PIT-09G-03
  const [absorberLevel, setAbsorberLevel] = useState(1100) // LIT-3201-05
  const [degasserPressure, setDegasserPressure] = useState(0.2) // PIT-2401-01
  const [flowRate, setFlowRate] = useState(150) // FIT-4782-C2
  const [sensorHealth, setSensorHealth] = useState(100) // For predictive maintenance

  // Pump state
  const [pumpRunning, setPumpRunning] = useState(true) // Start running so it can trip during scenarios
  const [pumpRotation, setPumpRotation] = useState('R') // L or R

  // Real-time trend data for graph (last 60 data points)
  const [trendData, setTrendData] = useState(Array(60).fill(1100))

  // Draggable trend graph state
  const [trendPosition, setTrendPosition] = useState({ x: 750, y: 350 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // Draggable faceplate positions (three independent faceplates)
  const [levelFaceplatePosition, setLevelFaceplatePosition] = useState({ x: 1200, y: 150 })
  const [pressureFaceplatePosition, setPressureFaceplatePosition] = useState({ x: 1200, y: 520 })
  const [flowFaceplatePosition, setFlowFaceplatePosition] = useState({ x: 1200, y: 760 })

  const [isLevelDragging, setIsLevelDragging] = useState(false)
  const [isPressureDragging, setIsPressureDragging] = useState(false)
  const [isFlowDragging, setIsFlowDragging] = useState(false)

  const [levelDragOffset, setLevelDragOffset] = useState({ x: 0, y: 0 })
  const [pressureDragOffset, setPressureDragOffset] = useState({ x: 0, y: 0 })
  const [flowDragOffset, setFlowDragOffset] = useState({ x: 0, y: 0 })

  // Multi-parameter trend data (for cause-effect visualization)
  const [pressureTrendData, setPressureTrendData] = useState(Array(60).fill(52))
  const [flowTrendData, setFlowTrendData] = useState(Array(60).fill(150))

  // Draggable vessel state
  const [vesselPosition, setVesselPosition] = useState({ x: 250, y: 350 })
  const [isVesselDragging, setIsVesselDragging] = useState(false)
  const [vesselDragOffset, setVesselDragOffset] = useState({ x: 0, y: 0 })

  // Resize states
  const [trendScale, setTrendScale] = useState(1)
  const [levelScale, setLevelScale] = useState(1)
  const [pressureScale, setPressureScale] = useState(1)
  const [flowScale, setFlowScale] = useState(1)
  const [vesselScale, setVesselScale] = useState(1)

  // Draggable popup state
  const [popupPosition, setPopupPosition] = useState({ x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 250 })
  const [isPopupDragging, setIsPopupDragging] = useState(false)
  const [popupDragOffset, setPopupDragOffset] = useState({ x: 0, y: 0 })

  // Track if we're in the HH/LL hold period
  const [isHoldingTrip, setIsHoldingTrip] = useState(false)

  // Pause/Play state
  const [isPaused, setIsPaused] = useState(false)

  // Alarm states with timestamps
  const [alarms, setAlarms] = useState([
    { id: 1, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false },
    { id: 2, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false },
    { id: 3, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false },
    { id: 4, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false },
    { id: 5, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false }
  ])

  // Timestamp tracking for first-out root cause
  const [rootCauseTimestamp, setRootCauseTimestamp] = useState(null)

  // Alarm flood state (for old way visualization)
  const [alarmFloodCount, setAlarmFloodCount] = useState(0)
  const [showAIIntervention, setShowAIIntervention] = useState(false)

  // Intervals for scenarios
  const intervalsRef = useRef([])

  // Clear all intervals
  const clearAllIntervals = () => {
    intervalsRef.current.forEach(interval => clearInterval(interval))
    intervalsRef.current = []
  }

  // Scenario 1: Root Cause Analysis - Three Cases
  const handleScenario1Case = (caseNum) => {
    if (activeScenario) return
    setActiveScenario(`1-${caseNum}`)
    clearAllIntervals()
    setShowAIIntervention(false)
    setAlarmFloodCount(0)
    setIsHoldingTrip(true)

    let rootCauseTag, rootCauseDesc, rootCauseValue

    // Define the three cases - Generic transmitter examples
    if (caseNum === 1) {
      // Case 1: Level Transmitter Root Cause
      rootCauseTag = 'LIT-XXX (Level Transmitter)'
      rootCauseDesc = 'Level Transmitter Failure'
      rootCauseValue = 'HIGH-HIGH Trip'
      setCurrentTransmitterType('level')
      // Spike level to HH trip point
      setAbsorberLevel(1500)
      setTrendData(prev => [...prev.slice(1), 1500])

      // Cascading effects: Level HH → Pressure rises, Flow drops
      setFlowLinePressure(58) // Pressure rises due to restricted outlet
      setFlowRate(0) // Flow stops due to pump shutdown
      setPressureTrendData(prev => [...prev.slice(1), 58])
      setFlowTrendData(prev => [...prev.slice(1), 0])

      // Keep updating HH values on trend continuously until reset (no time limit)
      const holdInterval = setInterval(() => {
        if (isPaused) return // Don't update if paused
        // Continue showing tripped values on trend indefinitely
        setTrendData(prev => [...prev.slice(1), 1500])
        setPressureTrendData(prev => [...prev.slice(1), 58])
        setFlowTrendData(prev => [...prev.slice(1), 0])
      }, 500)
      intervalsRef.current.push(holdInterval)

      // After 5 seconds, just stop holding (allow other logic to proceed) but keep trends updating
      setTimeout(() => {
        setIsHoldingTrip(false)
      }, 5000)
    } else if (caseNum === 2) {
      // Case 2: Pressure Transmitter Root Cause
      rootCauseTag = 'PIT-XXX (Pressure Transmitter)'
      rootCauseDesc = 'Pressure Transmitter Trip'
      rootCauseValue = 'HIGH-HIGH Trip'
      setCurrentTransmitterType('pressure')
      // Spike pressure to HH trip point
      setFlowLinePressure(60)
      setTrendData(prev => [...prev.slice(1), 60])
      setPressureTrendData(prev => [...prev.slice(1), 60])

      // Cascading effects: Pressure HH → Level rises, Flow drops
      setAbsorberLevel(1450) // Level rises due to restricted outlet
      setFlowRate(0) // Flow stops due to pump shutdown
      setFlowTrendData(prev => [...prev.slice(1), 0])

      // Keep updating HH values on trend continuously until reset (no time limit)
      const holdInterval = setInterval(() => {
        if (isPaused) return // Don't update if paused
        // Continue showing tripped values on trend indefinitely
        setTrendData(prev => [...prev.slice(1), 60])
        setPressureTrendData(prev => [...prev.slice(1), 60])
        setFlowTrendData(prev => [...prev.slice(1), 0])
      }, 500)
      intervalsRef.current.push(holdInterval)

      // After 5 seconds, just stop holding (allow other logic to proceed) but keep trends updating
      setTimeout(() => {
        setIsHoldingTrip(false)
      }, 5000)
    } else {
      // Case 3: Flow Transmitter Root Cause
      rootCauseTag = 'FIT-XXX (Flow Transmitter)'
      rootCauseDesc = 'Flow Transmitter Failure'
      rootCauseValue = 'LOW-LOW Trip'
      setCurrentTransmitterType('flow')
      // Drop flow to LL trip point
      setFlowRate(25)
      setTrendData(prev => [...prev.slice(1), 25])
      setFlowTrendData(prev => [...prev.slice(1), 25])

      // Cascading effects: Flow LL → Pressure drops, Level drops
      setFlowLinePressure(38) // Pressure drops due to low flow
      setAbsorberLevel(650) // Level drops due to insufficient inlet
      setPressureTrendData(prev => [...prev.slice(1), 38])

      // Keep updating LL values on trend continuously until reset (no time limit)
      const holdInterval = setInterval(() => {
        if (isPaused) return // Don't update if paused
        // Continue showing tripped values on trend indefinitely
        setTrendData(prev => [...prev.slice(1), 25])
        setFlowTrendData(prev => [...prev.slice(1), 25])
        setPressureTrendData(prev => [...prev.slice(1), 38])
      }, 500)
      intervalsRef.current.push(holdInterval)

      // After 5 seconds, just stop holding (allow other logic to proceed) but keep trends updating
      setTimeout(() => {
        setIsHoldingTrip(false)
      }, 5000)
    }

    // Step 1: Trigger the root cause alarm with timestamp (FIRST-OUT)
    const rootTimestamp = new Date()
    setRootCauseTimestamp(rootTimestamp)

    setAlarms(prev => {
      const newAlarms = [...prev]
      newAlarms[0] = {
        id: 1,
        active: true,
        priority: 'urgent',
        message: `${rootCauseTag}\n${rootCauseDesc}\n${rootCauseValue}`,
        timestamp: rootTimestamp,
        isFirstOut: true
      }
      return newAlarms
    })

    // Shutdown pump immediately on root cause alarm
    setPumpRunning(false)

    // Step 2: Simulate ALARM FLOOD (Old Way) after 5 seconds (hold HH/LL for 5 seconds first)
    setTimeout(() => {
      // Define all the secondary alarms that will appear - Generic cascading effects
      const secondaryAlarms = [
        'PIT-XXX\nPRESSURE\nLOW',
        'LIT-XXX\nLEVEL\nHIGH',
        'TIT-XXX\nTEMPERATURE\nHIGH',
        'PIT-XXX\nPRESSURE\nHIGH',
        'FIT-XXX\nFLOW\nLOW',
        'XV-XXX\nVALVE\nCLOSED',
        'PIT-XXX\nPRESSURE\nHIGH',
        'LIT-XXX\nLEVEL\nLOW',
        'TIT-XXX\nTEMPERATURE\nHIGH',
        'FIT-XXX\nFLOW\nLOW',
        'PIT-XXX\nPRESSURE\nHIGH',
        'LIT-XXX\nLEVEL\nLOW',
        'TIT-XXX\nTEMPERATURE\nLOW',
        'FIT-XXX\nFLOW\nHIGH',
        'PSV-XXX\nRELIEF VALVE\nOPEN',
        'PIT-XXX\nPRESSURE\nLOW',
        'LIT-XXX\nLEVEL\nHIGH',
        'TIT-XXX\nTEMPERATURE\nHIGH',
        'FIT-XXX\nFLOW\nLOW',
        'PIT-XXX\nPRESSURE\nHIGH',
        'LIT-XXX\nLEVEL\nHIGH',
        'TIT-XXX\nTEMPERATURE\nLOW',
        'FIT-XXX\nFLOW\nLOW',
        'PIT-XXX\nPRESSURE\nLOW',
        'LIT-XXX\nLEVEL\nLOW'
      ]

      let alarmIndex = 0
      const floodInterval = setInterval(() => {
        if (isPaused) return // Don't update if paused
        alarmIndex++
        setAlarmFloodCount(alarmIndex + 1) // +1 because we started with root cause

        // Show up to 5 most recent alarms in the alarm banner
        setAlarms(prev => {
          const newAlarms = [...prev]
          // Keep root cause in first position with FIRST-OUT marker
          newAlarms[0] = {
            id: 1,
            active: true,
            priority: 'urgent',
            message: `${rootCauseTag}\n${rootCauseDesc}\n${rootCauseValue}`,
            timestamp: rootTimestamp,
            isFirstOut: true
          }
          // Fill remaining slots with most recent alarms (cascading effects with later timestamps)
          for (let i = 1; i < 5; i++) {
            const alarmIdx = alarmIndex - (5 - i - 1)
            if (alarmIdx >= 0 && alarmIdx < secondaryAlarms.length) {
              // Each secondary alarm gets a timestamp slightly later (100ms intervals)
              const secondaryTimestamp = new Date(rootTimestamp.getTime() + (alarmIdx + 1) * 100)
              newAlarms[i] = {
                id: i + 1,
                active: true,
                priority: 'high',
                message: secondaryAlarms[alarmIdx],
                timestamp: secondaryTimestamp,
                isFirstOut: false
              }
            }
          }
          return newAlarms
        })

        // Stop flood at 25-30 alarms (25 secondary + 1 root cause)
        if (alarmIndex >= 25) {
          clearInterval(floodInterval)

          // Step 3: AI Intervention (New Way) - After showing the chaos
          setTimeout(() => {
            setShowAIIntervention(true)
            setPopupContent({
              type: 'root-cause',
              icon: '🤖',
              title: 'AI ROOT CAUSE ANALYSIS',
              message: `Root Cause Identified: ${rootCauseDesc}`,
              subtitle: 'AI isolated the root cause from cascading effects',
              details: [
                { label: '🎯 ROOT CAUSE (What Started It)', value: `${rootCauseTag} - ${rootCauseValue} - FIRST-OUT at ${rootTimestamp.toLocaleTimeString()}.${rootTimestamp.getMilliseconds()} - This single transmitter failure triggered the entire cascade across the facility.` },
                { label: '🔄 CASCADING EFFECTS (Consequences)', value: `${alarmIndex} secondary alarms across the facility: Pumps trip, valves close, pressure/level/flow/temperature alarms activate - ALL consequences of the root failure above. All occurred AFTER the first-out alarm.` },
                { label: '⚠️ OLD WAY (Without AI)', value: `Operator sees ${alarmIndex + 1} simultaneous alarms with no indication which is the root cause. Manual analysis takes 3-5 MINUTES.` },
                { label: '✅ NEW WAY (With AI)', value: `AI analyzes alarm timestamps (first-out identification) and shutdown logic relationships. Identifies root cause in 2 SECONDS. Works universally across ALL transmitter types (Level, Pressure, Flow, Temperature) throughout the entire gas processing facility.` },
                { label: '⏰ First-Out Root Cause', value: `AI detected ${rootCauseTag} tripped at ${rootTimestamp.toLocaleTimeString()}.${rootTimestamp.getMilliseconds()} - earliest timestamp = ROOT CAUSE. All other ${alarmIndex} alarms occurred 100ms+ later as cascading effects.` },
                { label: '🌐 Universal Application', value: 'Same AI logic applies to any transmitter anywhere in the facility - not limited to specific equipment or tag numbers.' },
                { label: '⏱️ Time Saved', value: 'Root cause identified in 2 seconds vs. 3-5 minutes manually' },
                { label: '🎯 Operator Focus', value: `Fix 1 root cause instead of troubleshooting ${alarmIndex + 1} alarms` }
              ]
            })
            setShowPopup(true)
          }, 2000)
        }
      }, 500) // Show new alarm every 500ms (slower, more visible)

      intervalsRef.current.push(floodInterval)
    }, 5000) // Hold HH/LL state for 5 seconds before alarm flood starts
  }

  // Scenario 2: Predictive Maintenance (FDM Integration)
  const handleScenario2 = () => {
    if (activeScenario) return
    setActiveScenario(2)
    clearAllIntervals()

    // Keep level in normal range but add noise and drift
    let time = 0
    let alertShown = false
    const noiseInterval = setInterval(() => {
      if (isPaused) return // Don't update if paused
      time += 0.1
      // Add micro-fluctuations (noise)
      const noise = Math.sin(time * 10) * 15 + Math.cos(time * 25) * 10
      // Add slow drift (+5% per hour simulated as +1% every 10 seconds)
      const drift = (time / 10) * 17 // 1% of 1700mm range
      const baseLevel = 1100
      const newLevel = baseLevel + noise + drift

      setAbsorberLevel(prev => {
        const bounded = Math.min(Math.max(newLevel, 710), 1425)
        setTrendData(prevTrend => [...prevTrend.slice(1), bounded])
        return bounded
      })

      // Update pressure and flow trends for multi-parameter display
      const pressureNoise = (Math.random() - 0.5) * 2
      const pressureWave = Math.sin(Date.now() / 5000) * 1
      setFlowLinePressure(prev => {
        const newPressure = 52 + pressureNoise + pressureWave
        const bounded = Math.min(Math.max(newPressure, 48), 55)
        setPressureTrendData(prevTrend => [...prevTrend.slice(1), bounded])
        return bounded
      })

      const flowNoise = (Math.random() - 0.5) * 10
      const flowWave = Math.sin(Date.now() / 5000) * 5
      setFlowRate(prev => {
        const newFlow = 150 + flowNoise + flowWave
        const bounded = Math.min(Math.max(newFlow, 140), 160)
        setFlowTrendData(prevTrend => [...prevTrend.slice(1), bounded])
        return bounded
      })

      // Degrade sensor health
      const healthDegradation = time * 2 // 2% per 0.1 second
      setSensorHealth(Math.max(20, 100 - healthDegradation))

      // Show predictive warning after some time (only once)
      if (time > 3 && !alertShown) {
        alertShown = true
        setPopupContent({
          type: 'predictive',
          icon: '🔧',
          title: 'PREDICTIVE MAINTENANCE ALERT',
          message: 'Sensor Health Degrading: LIT-3201-05',
          subtitle: 'Field Device Manager (FDM) has detected anomalies.',
          details: [
            { label: 'Tag', value: 'LIT-3201-05 (Amine Absorber Level Transmitter)' },
            { label: 'Signal Noise Level', value: 'ELEVATED (Above Threshold)' },
            { label: 'Drift Rate', value: `${((time / 10) * 5).toFixed(1)}% per hour (> 2% threshold)` },
            { label: 'Sensor Health', value: `${sensorHealth.toFixed(0)}%` },
            { label: 'Prediction', value: '80% probability of "Bad PV" failure in 24 hours' },
            { label: 'Recommendation', value: 'Schedule maintenance for LIT-3201-05 before next shift' }
          ]
        })
        setShowPopup(true)
      }
    }, 100)

    intervalsRef.current.push(noiseInterval)
  }

  // Scenario 3: Contextual Smart Shelving
  const handleScenario3 = () => {
    if (activeScenario) return
    setActiveScenario(3)
    clearAllIntervals()

    // Switch to pressure transmitter view
    setCurrentTransmitterType('pressure')

    // Initialize trend with historical oscillating data to show pattern
    const historicalData = []
    for (let i = 0; i < 60; i++) {
      // Create oscillating pattern that crosses 56 barg (high alarm) threshold
      // Oscillate between 54-57.5 barg (stays below HH at 60 barg)
      const oscillation = Math.sin(i / 3) * 1.75 // ±1.75 barg oscillation
      const value = 55.75 + oscillation // Center around 55.75, ranges 54-57.5 barg
      historicalData.push(value)
    }
    setTrendData(historicalData)

    // Track time in high alarm state for contextual analysis
    let timeInHighState = 0 // seconds
    let totalTimeElapsed = 0 // seconds

    // Oscillate pressure around high alarm trip point (56 barg)
    let oscillations = 0
    let alarmCount = 0
    let dialogShown = false
    const oscillateInterval = setInterval(() => {
      if (isPaused) return // Don't update if paused
      oscillations++
      totalTimeElapsed = oscillations * 0.2 // 200ms intervals = 0.2 seconds each

      // Oscillate between 54 and 57.5 barg crossing the 56 barg high alarm threshold
      const oscillation = Math.sin(oscillations / 3) * 1.75
      const newPressure = 55.75 + oscillation
      setFlowLinePressure(newPressure)

      // Track time spent in high alarm state
      if (newPressure > 56) {
        timeInHighState += 0.2
      }

      // Update trend data (pressure trend for shelving scenario)
      setTrendData(prevTrend => [...prevTrend.slice(1), newPressure])
      setPressureTrendData(prevTrend => [...prevTrend.slice(1), newPressure])

      // Update level and flow trends for multi-parameter display
      const levelNoise = (Math.random() - 0.5) * 30
      const levelWave = Math.sin(Date.now() / 5000) * 10
      setAbsorberLevel(prev => {
        const newLevel = 1100 + levelNoise + levelWave
        const bounded = Math.min(Math.max(newLevel, 1050), 1150)
        return bounded
      })

      const flowNoise = (Math.random() - 0.5) * 10
      const flowWave = Math.sin(Date.now() / 5000) * 5
      setFlowRate(prev => {
        const newFlow = 150 + flowNoise + flowWave
        const bounded = Math.min(Math.max(newFlow, 140), 160)
        setFlowTrendData(prevTrend => [...prevTrend.slice(1), bounded])
        return bounded
      })

      // Count alarms (every time we cross threshold going up)
      const prevOscillation = Math.sin((oscillations - 1) / 3) * 4
      const prevPressure = 56 + prevOscillation
      if (prevPressure <= 56 && newPressure > 56) {
        alarmCount++

        // Update alarm banner
        setAlarms(prev => {
          const newAlarms = [...prev]
          newAlarms[3] = {
            id: 4,
            active: true,
            priority: 'high',
            message: `PIT-4782-B7\nINLET PRESS\n${newPressure.toFixed(1)} barg (${alarmCount})`,
            timestamp: new Date(),
            isFirstOut: false
          }
          return newAlarms
        })

        // Show contextual shelving dialog after 5 alarms (only once)
        if (alarmCount >= 5 && !dialogShown) {
          dialogShown = true

          // Calculate contextual information
          const avgValue = 55.75
          const distanceFromHH = 60 - avgValue // Distance from HH trip
          const timeToShutdown = distanceFromHH / 0.5 // Estimated hours if trending up at 0.5 barg/hr
          const percentTimeInAlarm = (timeInHighState / totalTimeElapsed) * 100

          setPopupContent({
            type: 'shelve',
            icon: '🔕',
            title: 'CONTEXTUAL SMART ALARM SHELVING',
            message: 'Chattering Alarm Detected: PIT-4782-B7',
            subtitle: 'AI provides context on WHY this is happening and potential threats',
            details: [
              { label: '📊 Current Situation', value: `PIT-4782-B7 (Inlet Pressure) has alarmed ${alarmCount} times in the last ${totalTimeElapsed.toFixed(0)} seconds. Current value: ${newPressure.toFixed(1)} barg, oscillating between 54-57.5 barg.` },
              { label: '🔍 Root Cause Analysis', value: `WHY: The pressure is oscillating around the high alarm setpoint (56 barg) due to normal control system behavior. The process is stable but the alarm setpoint is too close to the normal operating range, causing nuisance alarms.` },
              { label: '⚠️ Potential Threat Assessment', value: `RISK LEVEL: LOW. Average pressure (55.75 barg) is ${distanceFromHH.toFixed(1)} barg below HH trip point (60 barg). Oscillations are ±1.75 barg. Current pattern poses NO immediate shutdown risk. Process has spent ${percentTimeInAlarm.toFixed(0)}% of time above setpoint but well below trip.` },
              { label: '⏰ Time Without Action', value: `This condition has persisted for ${totalTimeElapsed.toFixed(0)} seconds (${(totalTimeElapsed/60).toFixed(1)} minutes) without operator intervention. However, NO action is required as this is a nuisance alarm, not a process abnormality.` },
              { label: '🎯 Long-Term Implications', value: `If this pattern continues for 2+ hours without addressing the root cause (alarm setpoint too low), operator alarm fatigue will increase. Recommend: (1) Shelve for 2 hours, (2) Submit work order to raise high alarm setpoint from 56 to 58 barg to eliminate nuisance alarms.` },
              { label: '🛡️ Shutdown Prevention', value: `Current oscillation pattern will NOT cause shutdown. If pressure were to trend upward consistently (not oscillating), estimated time to HH trip (60 barg) would be ~${timeToShutdown.toFixed(1)} hours at typical drift rate. AI will continue monitoring for true process deviations.` },
              { label: '✅ AI Recommendation', value: 'SHELVE alarm for 2 hours to reduce operator distraction while maintaining monitoring. AI will unshelve immediately if pressure exhibits true abnormal behavior (sustained trend, rate-of-change spike, or approach to HH limit).' },
              { label: '📋 ISA-18.2 Compliance', value: 'Contextual smart shelving with continuous threat monitoring - reduces alarm load while maintaining safety.' }
            ],
            actions: [
              { label: 'SHELVE FOR 2 HOURS', action: 'shelve' },
              { label: 'IGNORE', action: 'ignore' }
            ]
          })
          setShowPopup(true)
        }
      }
    }, 200) // Update every 200ms

    intervalsRef.current.push(oscillateInterval)
  }

  // Reset simulation
  const handleReset = () => {
    clearAllIntervals()
    setActiveScenario(null)
    setShowPopup(false)
    setPopupContent(null)
    setH2sLevel(2)
    setFlowLinePressure(52)
    setAbsorberLevel(1100)
    setDegasserPressure(0.2)
    setSensorHealth(100)
    setAlarmFloodCount(0)
    setShowAIIntervention(false)
    setPumpRunning(true) // Reset to running state
    setTrendData(Array(60).fill(1100)) // Reset trend data
    setPressureTrendData(Array(60).fill(52)) // Reset pressure trend
    setFlowTrendData(Array(60).fill(150)) // Reset flow trend
    setCurrentTransmitterType('level') // Reset to level
    setIsHoldingTrip(false)
    setRootCauseTimestamp(null) // Reset timestamp
    setAlarms([
      { id: 1, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false },
      { id: 2, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false },
      { id: 3, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false },
      { id: 4, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false },
      { id: 5, active: false, priority: 'inactive', message: '', timestamp: null, isFirstOut: false }
    ])
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllIntervals()
  }, [])

  // Continuous normal process variation - simulates real plant behavior
  useEffect(() => {
    const normalVariationInterval = setInterval(() => {
      if (isPaused) return // Don't update if paused

      if (!activeScenario) {
        // Update ALL three parameters simultaneously during normal operation (no scenario active)

        // Level fluctuation
        const levelNoise = (Math.random() - 0.5) * 30
        const levelWave = Math.sin(Date.now() / 5000) * 10
        setAbsorberLevel(prev => {
          const newLevel = 1100 + levelNoise + levelWave
          const bounded = Math.min(Math.max(newLevel, 1050), 1150)
          setTrendData(prevTrend => [...prevTrend.slice(1), bounded])
          return bounded
        })

        // Pressure fluctuation
        const pressureNoise = (Math.random() - 0.5) * 2
        const pressureWave = Math.sin(Date.now() / 5000) * 1
        setFlowLinePressure(prev => {
          const newPressure = 52 + pressureNoise + pressureWave
          const bounded = Math.min(Math.max(newPressure, 48), 55)
          setPressureTrendData(prevTrend => [...prevTrend.slice(1), bounded])
          return bounded
        })

        // Flow fluctuation
        const flowNoise = (Math.random() - 0.5) * 10
        const flowWave = Math.sin(Date.now() / 5000) * 5
        setFlowRate(prev => {
          const newFlow = 150 + flowNoise + flowWave
          const bounded = Math.min(Math.max(newFlow, 140), 160)
          setFlowTrendData(prevTrend => [...prevTrend.slice(1), bounded])
          return bounded
        })
      }
    }, 500) // Update every 500ms

    return () => clearInterval(normalVariationInterval)
  }, [activeScenario, currentTransmitterType, isHoldingTrip, isPaused])

  // Calculate level percentage for visual display
  const levelPercentage = ((absorberLevel - 0) / (1700 - 0)) * 100

  // Get dynamic transmitter info based on current type
  const getTransmitterInfo = () => {
    if (currentTransmitterType === 'level') {
      return {
        tag: 'LIT-4782-A3',
        description: 'Separator Level',
        unit: 'mm',
        currentValue: absorberLevel.toFixed(0),
        hhLimit: 1500,
        hiLimit: 1425,
        loLimit: 710,
        llLimit: 600,
        minScale: 500,
        maxScale: 1600
      }
    } else if (currentTransmitterType === 'pressure') {
      return {
        tag: 'PIT-4782-B7',
        description: 'Inlet Pressure',
        unit: 'barg',
        currentValue: flowLinePressure.toFixed(2),
        hhLimit: 60,
        hiLimit: 56,
        loLimit: 40,
        llLimit: 34,
        minScale: 30,
        maxScale: 65
      }
    } else {
      return {
        tag: 'FIT-4782-C2',
        description: 'Outlet Flow Rate',
        unit: 'm³/h',
        currentValue: flowRate.toFixed(1),
        hhLimit: 250,
        hiLimit: 225,
        loLimit: 50,
        llLimit: 25,
        minScale: 0,
        maxScale: 300
      }
    }
  }

  const transmitterInfo = getTransmitterInfo()

  // Drag handlers for trend graph
  const handleMouseDown = (e) => {
    setIsDragging(true)
    setDragOffset({
      x: e.clientX - trendPosition.x,
      y: e.clientY - trendPosition.y
    })
  }

  // Drag handlers for level faceplate
  const handleLevelMouseDown = (e) => {
    setIsLevelDragging(true)
    setLevelDragOffset({
      x: e.clientX - levelFaceplatePosition.x,
      y: e.clientY - levelFaceplatePosition.y
    })
  }

  // Drag handlers for pressure faceplate
  const handlePressureMouseDown = (e) => {
    setIsPressureDragging(true)
    setPressureDragOffset({
      x: e.clientX - pressureFaceplatePosition.x,
      y: e.clientY - pressureFaceplatePosition.y
    })
  }

  // Drag handlers for flow faceplate
  const handleFlowMouseDown = (e) => {
    setIsFlowDragging(true)
    setFlowDragOffset({
      x: e.clientX - flowFaceplatePosition.x,
      y: e.clientY - flowFaceplatePosition.y
    })
  }

  // Drag handlers for vessel
  const handleVesselMouseDown = (e) => {
    setIsVesselDragging(true)
    setVesselDragOffset({
      x: e.clientX - vesselPosition.x,
      y: e.clientY - vesselPosition.y
    })
  }

  // Drag handlers for popup
  const handlePopupMouseDown = (e) => {
    // Only allow dragging from header area
    if (e.target.closest('.popup-header')) {
      setIsPopupDragging(true)
      setPopupDragOffset({
        x: e.clientX - popupPosition.x,
        y: e.clientY - popupPosition.y
      })
      e.stopPropagation()
    }
  }

  // Add global mouse event listeners for trend graph dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setTrendPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset, trendPosition])

  // Add global mouse event listeners for level faceplate dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isLevelDragging) {
        setLevelFaceplatePosition({
          x: e.clientX - levelDragOffset.x,
          y: e.clientY - levelDragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsLevelDragging(false)
    }

    if (isLevelDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isLevelDragging, levelDragOffset])

  // Add global mouse event listeners for pressure faceplate dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isPressureDragging) {
        setPressureFaceplatePosition({
          x: e.clientX - pressureDragOffset.x,
          y: e.clientY - pressureDragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsPressureDragging(false)
    }

    if (isPressureDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isPressureDragging, pressureDragOffset])

  // Add global mouse event listeners for flow faceplate dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isFlowDragging) {
        setFlowFaceplatePosition({
          x: e.clientX - flowDragOffset.x,
          y: e.clientY - flowDragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsFlowDragging(false)
    }

    if (isFlowDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isFlowDragging, flowDragOffset])

  // Add global mouse event listeners for vessel dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isVesselDragging) {
        setVesselPosition({
          x: e.clientX - vesselDragOffset.x,
          y: e.clientY - vesselDragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsVesselDragging(false)
    }

    if (isVesselDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isVesselDragging, vesselDragOffset, vesselPosition])

  // Add global mouse event listeners for popup dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isPopupDragging) {
        setPopupPosition({
          x: e.clientX - popupDragOffset.x,
          y: e.clientY - popupDragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsPopupDragging(false)
    }

    if (isPopupDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isPopupDragging, popupDragOffset, popupPosition])

  return (
    <div className="hmi-container">
      {/* Menu Bar */}
      <div className="menu-bar">
        <button>File</button>
        <button>View</button>
        <button>Trends</button>
        <button>Alarms</button>
        <button>System</button>
      </div>

      {/* Main Display Area */}
      <div className="main-display">
        <div className="process-container">
          <h2 className="process-title">Production Separator - AI Alarm Management</h2>

          {/* Scenario Buttons */}
          <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Pause/Play Button */}
            <button
              className="simulate-button"
              onClick={() => setIsPaused(!isPaused)}
              style={{
                fontSize: '14px',
                padding: '10px 16px',
                backgroundColor: isPaused ? '#00aa00' : '#cc6600',
                fontWeight: 'bold'
              }}
            >
              {isPaused ? '▶ PLAY' : '⏸ PAUSE'}
            </button>

            <div style={{ borderTop: '1px solid #555', margin: '5px 0' }}></div>

            <div style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 'bold', marginBottom: '5px' }}>AI ROOT CAUSE ANALYSIS</div>
            <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '5px', lineHeight: '1.3' }}>Universal logic works on ANY transmitter type facility-wide</div>

            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                className="simulate-button"
                onClick={() => {
                  setCurrentTransmitterType('level');
                  // Initialize with normal operating values for all parameters
                  setAbsorberLevel(1100);
                  setFlowLinePressure(52);
                  setFlowRate(150);
                  setTrendData(Array(60).fill(1100));
                  setPressureTrendData(Array(60).fill(52));
                  setFlowTrendData(Array(60).fill(150));
                }}
                disabled={activeScenario !== null && !activeScenario.toString().startsWith('1-')}
                style={{ fontSize: '11px', padding: '8px 12px', flex: 1 }}
              >
                Example: LEVEL (LIT-XXX)
              </button>
              {currentTransmitterType === 'level' && !activeScenario && (
                <button
                  className="simulate-button"
                  onClick={() => handleScenario1Case(1)}
                  style={{ fontSize: '10px', padding: '6px 10px', backgroundColor: '#cc0000' }}
                >
                  Trigger
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                className="simulate-button"
                onClick={() => {
                  setCurrentTransmitterType('pressure');
                  // Initialize with normal operating values for all parameters
                  setAbsorberLevel(1100);
                  setFlowLinePressure(52);
                  setFlowRate(150);
                  setTrendData(Array(60).fill(1100));
                  setPressureTrendData(Array(60).fill(52));
                  setFlowTrendData(Array(60).fill(150));
                }}
                disabled={activeScenario !== null && !activeScenario.toString().startsWith('1-')}
                style={{ fontSize: '11px', padding: '8px 12px', flex: 1 }}
              >
                Example: PRESSURE (PIT-XXX)
              </button>
              {currentTransmitterType === 'pressure' && !activeScenario && (
                <button
                  className="simulate-button"
                  onClick={() => handleScenario1Case(2)}
                  style={{ fontSize: '10px', padding: '6px 10px', backgroundColor: '#cc0000' }}
                >
                  Trigger
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <button
                className="simulate-button"
                onClick={() => {
                  setCurrentTransmitterType('flow');
                  // Initialize with normal operating values for all parameters
                  setAbsorberLevel(1100);
                  setFlowLinePressure(52);
                  setFlowRate(150);
                  setTrendData(Array(60).fill(1100));
                  setPressureTrendData(Array(60).fill(52));
                  setFlowTrendData(Array(60).fill(150));
                }}
                disabled={activeScenario !== null && !activeScenario.toString().startsWith('1-')}
                style={{ fontSize: '11px', padding: '8px 12px', flex: 1 }}
              >
                Example: FLOW (FIT-XXX)
              </button>
              {currentTransmitterType === 'flow' && !activeScenario && (
                <button
                  className="simulate-button"
                  onClick={() => handleScenario1Case(3)}
                  style={{ fontSize: '10px', padding: '6px 10px', backgroundColor: '#cc0000' }}
                >
                  Trigger
                </button>
              )}
            </div>
            <div style={{ borderTop: '1px solid #555', margin: '10px 0' }}></div>
            <button
              className="simulate-button"
              onClick={handleScenario2}
              disabled={activeScenario !== null}
              style={{ fontSize: '11px', padding: '8px 12px', backgroundColor: '#ff8800' }}
            >
              PREDICTIVE MAINTENANCE
            </button>
            <button
              className="simulate-button"
              onClick={handleScenario3}
              disabled={activeScenario !== null}
              style={{ fontSize: '11px', padding: '8px 12px', backgroundColor: '#0088ff' }}
            >
              NUISANCE ALARM SHELVING
            </button>
            {activeScenario && (
              <button
                className="simulate-button"
                onClick={handleReset}
                style={{ fontSize: '11px', padding: '8px 12px', backgroundColor: '#666' }}
              >
                RESET
              </button>
            )}
          </div>

          {/* Production Separator Vessel */}
          <div
            className="absorber-column"
            style={{
              left: `${vesselPosition.x}px`,
              top: `${vesselPosition.y}px`,
              cursor: isVesselDragging ? 'grabbing' : 'grab',
              transform: `scale(${vesselScale})`,
              transformOrigin: 'top left'
            }}
            onMouseDown={handleVesselMouseDown}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                setVesselScale(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 2))
              }
            }}
          >
            <div className="absorber-top"></div>
            <div className="absorber-bottom"></div>
            <div
              className="level-indicator"
              style={{ height: `${levelPercentage}%` }}
            ></div>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: '#1a1a1a',
              fontSize: '18px',
              fontWeight: 'bold',
              zIndex: 10,
              textShadow: '1px 1px 3px rgba(255,255,255,0.8)',
              textAlign: 'center',
              pointerEvents: 'none'
            }}>
              VS-4782<br/>
              <span style={{ fontSize: '12px' }}>Production Separator</span>
            </div>
          </div>

          {/* Real-Time Trend Graph */}
          <div
            className="trend-graph"
            style={{
              left: `${trendPosition.x}px`,
              top: `${trendPosition.y}px`,
              cursor: isDragging ? 'grabbing' : 'grab',
              transform: `scale(${trendScale})`,
              transformOrigin: 'top left'
            }}
            onMouseDown={handleMouseDown}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                setTrendScale(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 2))
              }
            }}
          >
            <div className="trend-graph-header">Multi-Parameter Cause & Effect Trend</div>
            <div className="trend-graph-subtitle">Showing cascading relationships between Level, Pressure, and Flow</div>

            <div className="trend-graph-canvas">
              <svg width="100%" height="100%" viewBox="0 0 550 220" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* Grid lines */}
                <line x1="0" y1="55" x2="550" y2="55" stroke="#222" strokeWidth="1" />
                <line x1="0" y1="110" x2="550" y2="110" stroke="#222" strokeWidth="1" />
                <line x1="0" y1="165" x2="550" y2="165" stroke="#222" strokeWidth="1" />

                {/* Alarm limit lines - Dynamic based on transmitter type */}
                {/* HH (High-High) Trip - RED */}
                <line
                  x1="0"
                  y1={220 - ((transmitterInfo.hhLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220)}
                  x2="550"
                  y2={220 - ((transmitterInfo.hhLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220)}
                  className="trend-graph-hh-line"
                />
                <text
                  x="5"
                  y={220 - ((transmitterInfo.hhLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220) - 3}
                  fill="#ff0000"
                  fontSize="12"
                  fontWeight="bold"
                >
                  HH: {transmitterInfo.hhLimit}{transmitterInfo.unit} (TRIP)
                </text>

                {/* Hi (High) Warning - ORANGE */}
                <line
                  x1="0"
                  y1={220 - ((transmitterInfo.hiLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220)}
                  x2="550"
                  y2={220 - ((transmitterInfo.hiLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220)}
                  className="trend-graph-hi-line"
                />
                <text
                  x="5"
                  y={220 - ((transmitterInfo.hiLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220) - 3}
                  fill="#ffaa00"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Hi: {transmitterInfo.hiLimit}{transmitterInfo.unit} (Warning)
                </text>

                {/* Lo (Low) Warning - ORANGE */}
                <line
                  x1="0"
                  y1={220 - ((transmitterInfo.loLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220)}
                  x2="550"
                  y2={220 - ((transmitterInfo.loLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220)}
                  className="trend-graph-lo-line"
                />
                <text
                  x="5"
                  y={220 - ((transmitterInfo.loLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220) - 3}
                  fill="#ffaa00"
                  fontSize="12"
                  fontWeight="bold"
                >
                  Lo: {transmitterInfo.loLimit}{transmitterInfo.unit} (Warning)
                </text>

                {/* LL (Low-Low) Trip - RED */}
                <line
                  x1="0"
                  y1={220 - ((transmitterInfo.llLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220)}
                  x2="550"
                  y2={220 - ((transmitterInfo.llLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220)}
                  className="trend-graph-ll-line"
                />
                <text
                  x="5"
                  y={220 - ((transmitterInfo.llLimit - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale) * 220) + 12}
                  fill="#ff0000"
                  fontSize="12"
                  fontWeight="bold"
                >
                  LL: {transmitterInfo.llLimit}{transmitterInfo.unit} (TRIP)
                </text>

                {/* Level Trend Line - Normalized to 0-100% */}
                <polyline
                  points={trendData.map((value, index) => {
                    const x = (index / (trendData.length - 1)) * 550
                    const normalized = ((value - 500) / (1600 - 500)) * 220 // Level: 500-1600mm
                    const y = 220 - normalized
                    return `${x},${Math.max(0, Math.min(220, y))}`
                  }).join(' ')}
                  stroke={absorberLevel >= 1500 || absorberLevel <= 600 ? '#ff0000' : '#00ff00'}
                  strokeWidth="3"
                  fill="none"
                  filter="drop-shadow(0 0 3px #00ff00)"
                />

                {/* Pressure Trend Line - Normalized to 0-100% */}
                <polyline
                  points={pressureTrendData.map((value, index) => {
                    const x = (index / (pressureTrendData.length - 1)) * 550
                    const normalized = ((value - 30) / (65 - 30)) * 220 // Pressure: 30-65 barg
                    const y = 220 - normalized
                    return `${x},${Math.max(0, Math.min(220, y))}`
                  }).join(' ')}
                  stroke={flowLinePressure >= 60 || flowLinePressure <= 34 ? '#ff6600' : '#ffaa00'}
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="none"
                />

                {/* Flow Trend Line - Normalized to 0-100% */}
                <polyline
                  points={flowTrendData.map((value, index) => {
                    const x = (index / (flowTrendData.length - 1)) * 550
                    const normalized = ((value - 0) / (300 - 0)) * 220 // Flow: 0-300 m³/h
                    const y = 220 - normalized
                    return `${x},${Math.max(0, Math.min(220, y))}`
                  }).join(' ')}
                  stroke={flowRate >= 250 || flowRate <= 25 ? '#0088ff' : '#00ccff'}
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="none"
                />
              </svg>
            </div>

            <div className="trend-graph-labels">
              <span>60s ago</span>
              <span>30s ago</span>
              <span>Now</span>
            </div>

            <div className="trend-graph-legend">
              <div className="trend-graph-legend-item">
                <div className="trend-graph-legend-color" style={{ backgroundColor: '#00ff00', width: '20px', height: '3px' }}></div>
                <span style={{ fontSize: '10px' }}>Level (Primary)</span>
              </div>
              <div className="trend-graph-legend-item">
                <div className="trend-graph-legend-color" style={{ backgroundColor: '#ffaa00', width: '20px', height: '2px' }}></div>
                <span style={{ fontSize: '10px' }}>Pressure (Effect)</span>
              </div>
              <div className="trend-graph-legend-item">
                <div className="trend-graph-legend-color" style={{ backgroundColor: '#00ccff', width: '20px', height: '2px' }}></div>
                <span style={{ fontSize: '10px' }}>Flow (Effect)</span>
              </div>
            </div>
          </div>

          {/* Primary Faceplate - Root Cause (Level) */}
          <div
            style={{
              position: 'absolute',
              left: `${levelFaceplatePosition.x}px`,
              top: `${levelFaceplatePosition.y}px`,
              cursor: isLevelDragging ? 'grabbing' : 'grab',
              transform: `scale(${levelScale})`,
              transformOrigin: 'top left'
            }}
            onMouseDown={handleLevelMouseDown}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                setLevelScale(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 2))
              }
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                className="value-display"
                style={{
                  border: '5px solid #ff0000',
                  boxShadow: '0 0 25px rgba(255, 0, 0, 0.9), inset 0 0 10px rgba(255, 0, 0, 0.3)'
                }}
              >
            {/* Header */}
            <div className="value-display-header">
              <span>{transmitterInfo.tag}</span>
              <span className="value-display-close">✕</span>
            </div>

            {/* Body */}
            <div className="value-display-body">
              <div className="value-display-icon">⚙️</div>
              <div className="value-display-tag">{transmitterInfo.tag}</div>
              <div className="value-display-desc">Separator Vessel</div>
              <div className="value-display-desc">(VS-4782)</div>
              <div className="value-display-desc">{transmitterInfo.description}</div>

              {/* Reading with bar chart */}
              <div className="value-display-reading">
                <div style={{ flex: 1 }}>
                  <div className="value-display-number">{transmitterInfo.currentValue}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '80px', fontSize: '9px', color: '#555' }}>
                    <span>{transmitterInfo.maxScale}</span>
                    <span>{transmitterInfo.minScale}</span>
                  </div>
                  <div className="value-display-bar-container">
                    <div className="value-display-bar-fill" style={{
                      height: `${((parseFloat(transmitterInfo.currentValue) - transmitterInfo.minScale) / (transmitterInfo.maxScale - transmitterInfo.minScale)) * 100}%`
                    }}></div>
                  </div>
                  <div className="value-display-bar-label">{transmitterInfo.unit}</div>
                </div>
              </div>

              {/* Setpoints - All Four Levels */}
              <div className="value-display-setpoints">
                <div style={{ color: '#ff0000', fontWeight: 'bold' }}>HH (Trip) &nbsp;&nbsp;{transmitterInfo.hhLimit}</div>
                <div style={{ color: '#cc6600' }}>Hi (Warn) &nbsp;&nbsp;{transmitterInfo.hiLimit}</div>
                <div style={{ color: '#cc6600' }}>Lo (Warn) &nbsp;&nbsp;{transmitterInfo.loLimit}</div>
                <div style={{ color: '#ff0000', fontWeight: 'bold' }}>LL (Trip) &nbsp;&nbsp;{transmitterInfo.llLimit}</div>
              </div>

              {/* Status - Show alarm level based on value */}
              <div className="value-display-status">
                {sensorHealth < 80 ? (
                  <>
                    <span className="value-display-status-icon">⚠️</span>
                    <span>BadPv</span>
                  </>
                ) : parseFloat(transmitterInfo.currentValue) >= transmitterInfo.hhLimit ? (
                  <>
                    <span className="value-display-status-icon" style={{ color: '#ff0000' }}>🚨</span>
                    <span style={{ color: '#ff0000', fontWeight: 'bold' }}>PvHH - TRIP</span>
                  </>
                ) : parseFloat(transmitterInfo.currentValue) > transmitterInfo.hiLimit ? (
                  <>
                    <span className="value-display-status-icon" style={{ color: '#cc6600' }}>⚠️</span>
                    <span style={{ color: '#cc6600' }}>PvHi - WARNING</span>
                  </>
                ) : parseFloat(transmitterInfo.currentValue) <= transmitterInfo.llLimit ? (
                  <>
                    <span className="value-display-status-icon" style={{ color: '#ff0000' }}>🚨</span>
                    <span style={{ color: '#ff0000', fontWeight: 'bold' }}>PvLL - TRIP</span>
                  </>
                ) : parseFloat(transmitterInfo.currentValue) < transmitterInfo.loLimit ? (
                  <>
                    <span className="value-display-status-icon" style={{ color: '#cc6600' }}>⚠️</span>
                    <span style={{ color: '#cc6600' }}>PvLo - WARNING</span>
                  </>
                ) : (
                  <span style={{ color: '#00ff00' }}>Normal</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '10px' }}>🔔</span>
              </div>

              {/* Simulation label */}
              <div className="value-display-simulation">Simulation</div>
            </div>

            {/* Footer */}
            <div className="value-display-footer">
              <span style={{ color: '#00a0a0' }}>PV</span>
              <span className="value-display-mode-badge">M</span>
              <span style={{ fontWeight: 'bold' }}>{transmitterInfo.currentValue}</span>
              <span>{transmitterInfo.unit}</span>
              {sensorHealth < 100 && (
                <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#cc6600' }}>
                  H:{sensorHealth.toFixed(0)}%
                </span>
              )}
            </div>
              </div>
            </div>
          </div>

          {/* Secondary Faceplate 1 - Pressure Effect */}
          <div
            style={{
              position: 'absolute',
              left: `${pressureFaceplatePosition.x}px`,
              top: `${pressureFaceplatePosition.y}px`,
              cursor: isPressureDragging ? 'grabbing' : 'grab',
              transform: `scale(${pressureScale})`,
              transformOrigin: 'top left'
            }}
            onMouseDown={handlePressureMouseDown}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                setPressureScale(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 2))
              }
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                className="value-display"
                style={{
                  transform: 'scale(0.65)',
                  transformOrigin: 'top left',
                  border: '5px solid #ffaa00',
                  boxShadow: '0 0 25px rgba(255, 170, 0, 0.9), inset 0 0 10px rgba(255, 170, 0, 0.3)'
                }}
              >
                {/* Header */}
                <div className="value-display-header">
                  <span>PIT-4782-B7</span>
                  <span className="value-display-close">✕</span>
                </div>

                {/* Body */}
                <div className="value-display-body">
                  <div className="value-display-icon">⚙️</div>
                  <div className="value-display-tag">PIT-4782-B7</div>
                  <div className="value-display-desc">Separator Vessel</div>
                  <div className="value-display-desc">(VS-4782)</div>
                  <div className="value-display-desc">Inlet Pressure</div>

                  {/* Reading with bar chart */}
                  <div className="value-display-reading">
                    <div style={{ flex: 1 }}>
                      <div className="value-display-number">{flowLinePressure.toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '80px', fontSize: '9px', color: '#555' }}>
                        <span>65</span>
                        <span>30</span>
                      </div>
                      <div className="value-display-bar-container">
                        <div className="value-display-bar-fill" style={{
                          height: `${((flowLinePressure - 30) / (65 - 30)) * 100}%`
                        }}></div>
                      </div>
                      <div className="value-display-bar-label">barg</div>
                    </div>
                  </div>

                  {/* Setpoints - All Four Levels */}
                  <div className="value-display-setpoints">
                    <div style={{ color: '#ff0000', fontWeight: 'bold' }}>HH (Trip) &nbsp;&nbsp;60</div>
                    <div style={{ color: '#cc6600' }}>Hi (Warn) &nbsp;&nbsp;56</div>
                    <div style={{ color: '#cc6600' }}>Lo (Warn) &nbsp;&nbsp;40</div>
                    <div style={{ color: '#ff0000', fontWeight: 'bold' }}>LL (Trip) &nbsp;&nbsp;34</div>
                  </div>

                  {/* Status - Show alarm level based on value */}
                  <div className="value-display-status">
                    {flowLinePressure >= 60 ? (
                      <>
                        <span className="value-display-status-icon" style={{ color: '#ff0000' }}>🚨</span>
                        <span style={{ color: '#ff0000', fontWeight: 'bold' }}>PvHH - TRIP</span>
                      </>
                    ) : flowLinePressure > 56 ? (
                      <>
                        <span className="value-display-status-icon" style={{ color: '#cc6600' }}>⚠️</span>
                        <span style={{ color: '#cc6600' }}>PvHi - WARNING</span>
                      </>
                    ) : flowLinePressure <= 34 ? (
                      <>
                        <span className="value-display-status-icon" style={{ color: '#ff0000' }}>🚨</span>
                        <span style={{ color: '#ff0000', fontWeight: 'bold' }}>PvLL - TRIP</span>
                      </>
                    ) : flowLinePressure < 40 ? (
                      <>
                        <span className="value-display-status-icon" style={{ color: '#cc6600' }}>⚠️</span>
                        <span style={{ color: '#cc6600' }}>PvLo - WARNING</span>
                      </>
                    ) : (
                      <span style={{ color: '#00ff00' }}>Normal</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '10px' }}>🔔</span>
                  </div>

                  {/* Simulation label */}
                  <div className="value-display-simulation">Simulation</div>
                </div>

                {/* Footer */}
                <div className="value-display-footer">
                  <span style={{ color: '#00a0a0' }}>PV</span>
                  <span className="value-display-mode-badge">M</span>
                  <span style={{ fontWeight: 'bold' }}>{flowLinePressure.toFixed(2)}</span>
                  <span>barg</span>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Faceplate 2 - Flow Effect */}
          <div
            style={{
              position: 'absolute',
              left: `${flowFaceplatePosition.x}px`,
              top: `${flowFaceplatePosition.y}px`,
              cursor: isFlowDragging ? 'grabbing' : 'grab',
              transform: `scale(${flowScale})`,
              transformOrigin: 'top left'
            }}
            onMouseDown={handleFlowMouseDown}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault()
                setFlowScale(prev => Math.min(Math.max(prev + (e.deltaY > 0 ? -0.1 : 0.1), 0.5), 2))
              }
            }}
          >
            <div style={{ position: 'relative' }}>
              <div
                className="value-display"
                style={{
                  transform: 'scale(0.65)',
                  transformOrigin: 'top left',
                  border: '5px solid #00ccff',
                  boxShadow: '0 0 25px rgba(0, 204, 255, 0.9), inset 0 0 10px rgba(0, 204, 255, 0.3)'
                }}
              >
                {/* Header */}
                <div className="value-display-header">
                  <span>FIT-4782-C2</span>
                  <span className="value-display-close">✕</span>
                </div>

                {/* Body */}
                <div className="value-display-body">
                  <div className="value-display-icon">⚙️</div>
                  <div className="value-display-tag">FIT-4782-C2</div>
                  <div className="value-display-desc">Separator Vessel</div>
                  <div className="value-display-desc">(VS-4782)</div>
                  <div className="value-display-desc">Outlet Flow Rate</div>

                  {/* Reading with bar chart */}
                  <div className="value-display-reading">
                    <div style={{ flex: 1 }}>
                      <div className="value-display-number">{flowRate.toFixed(1)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '80px', fontSize: '9px', color: '#555' }}>
                        <span>300</span>
                        <span>0</span>
                      </div>
                      <div className="value-display-bar-container">
                        <div className="value-display-bar-fill" style={{
                          height: `${((flowRate - 0) / (300 - 0)) * 100}%`
                        }}></div>
                      </div>
                      <div className="value-display-bar-label">m³/h</div>
                    </div>
                  </div>

                  {/* Setpoints - All Four Levels */}
                  <div className="value-display-setpoints">
                    <div style={{ color: '#ff0000', fontWeight: 'bold' }}>HH (Trip) &nbsp;&nbsp;250</div>
                    <div style={{ color: '#cc6600' }}>Hi (Warn) &nbsp;&nbsp;225</div>
                    <div style={{ color: '#cc6600' }}>Lo (Warn) &nbsp;&nbsp;50</div>
                    <div style={{ color: '#ff0000', fontWeight: 'bold' }}>LL (Trip) &nbsp;&nbsp;25</div>
                  </div>

                  {/* Status - Show alarm level based on value */}
                  <div className="value-display-status">
                    {flowRate >= 250 ? (
                      <>
                        <span className="value-display-status-icon" style={{ color: '#ff0000' }}>🚨</span>
                        <span style={{ color: '#ff0000', fontWeight: 'bold' }}>PvHH - TRIP</span>
                      </>
                    ) : flowRate > 225 ? (
                      <>
                        <span className="value-display-status-icon" style={{ color: '#cc6600' }}>⚠️</span>
                        <span style={{ color: '#cc6600' }}>PvHi - WARNING</span>
                      </>
                    ) : flowRate <= 25 ? (
                      <>
                        <span className="value-display-status-icon" style={{ color: '#ff0000' }}>🚨</span>
                        <span style={{ color: '#ff0000', fontWeight: 'bold' }}>PvLL - TRIP</span>
                      </>
                    ) : flowRate < 50 ? (
                      <>
                        <span className="value-display-status-icon" style={{ color: '#cc6600' }}>⚠️</span>
                        <span style={{ color: '#cc6600' }}>PvLo - WARNING</span>
                      </>
                    ) : (
                      <span style={{ color: '#00ff00' }}>Normal</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: '10px' }}>🔔</span>
                  </div>

                  {/* Simulation label */}
                  <div className="value-display-simulation">Simulation</div>
                </div>

                {/* Footer */}
                <div className="value-display-footer">
                  <span style={{ color: '#00a0a0' }}>PV</span>
                  <span className="value-display-mode-badge">M</span>
                  <span style={{ fontWeight: 'bold' }}>{flowRate.toFixed(1)}</span>
                  <span>m³/h</span>
                </div>
              </div>
            </div>
          </div>


          {/* Alarm Flood Status Bar - OLD WAY Visualization */}
          {alarmFloodCount > 0 && !showAIIntervention && (
            <div className="alarm-flood-banner">
              <div className="flood-warning">⚠️ ALARM FLOOD (OLD WAY)</div>
              <div className="flood-counter">{alarmFloodCount}+ ALARMS</div>
              <div className="flood-message">Operator analyzing... | 🔄 Cascading: Pump trips, valves, pressure, level, temp</div>
            </div>
          )}

          {/* AI Intervention Status Bar */}
          {showAIIntervention && (
            <div className="ai-intervention-banner">
              <div className="ai-indicator">🤖 AI ANALYZING</div>
              <div style={{ borderLeft: '2px solid #00ccff', paddingLeft: '15px', marginLeft: '15px' }}>
                <div style={{ fontSize: '11px', color: '#aaccff', marginBottom: '3px' }}>OLD WAY: Manual analysis 3-5 minutes</div>
                <div style={{ fontSize: '11px', color: '#ccffcc', fontWeight: 'bold' }}>NEW WAY: AI identifies root cause in 2 seconds</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Alarm Banner */}
      <div className="alarm-banner">
        {alarms.map((alarm) => (
          <div
            key={alarm.id}
            className={`alarm-button ${alarm.priority}`}
            style={{
              position: 'relative',
              border: alarm.isFirstOut ? '2px solid #ffff00' : undefined,
              boxShadow: alarm.isFirstOut ? '0 0 10px rgba(255, 255, 0, 0.8)' : undefined
            }}
          >
            {alarm.active ? (
              <>
                {alarm.isFirstOut && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    backgroundColor: '#ffff00',
                    color: '#000',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}>
                    FIRST-OUT
                  </div>
                )}
                <div>{alarm.message}</div>
                {alarm.timestamp && (
                  <div style={{
                    fontSize: '8px',
                    color: alarm.isFirstOut ? '#ffff00' : '#aaa',
                    marginTop: '3px',
                    fontFamily: 'monospace'
                  }}>
                    {alarm.timestamp.toLocaleTimeString()}.{alarm.timestamp.getMilliseconds().toString().padStart(3, '0')}
                  </div>
                )}
              </>
            ) : `[ALARM ${alarm.id}]`}
          </div>
        ))}
      </div>

      {/* AI Popup - Dynamic based on scenario */}
      {showPopup && popupContent && (
        <div className="popup-overlay" onClick={() => { setShowPopup(false); setPopupContent(null); }}>
          <div
            className="popup-content"
            style={{
              left: `${popupPosition.x}px`,
              top: `${popupPosition.y}px`,
              position: 'absolute',
              cursor: isPopupDragging ? 'grabbing' : 'default'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={handlePopupMouseDown}
          >
            <div className="popup-header" style={{ cursor: 'grab' }}>
              <span className="popup-icon">{popupContent.icon}</span>
              {popupContent.title}
            </div>
            <div className="popup-message">
              <strong>{popupContent.message}</strong>
              <br /><br />
              {popupContent.subtitle}
            </div>
            <div className="popup-details">
              {popupContent.details.map((detail, index) => (
                <div key={index} className="popup-detail-item">
                  <strong>{detail.label}:</strong> {detail.value}
                </div>
              ))}
            </div>
            {popupContent.actions ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                {popupContent.actions.map((action, index) => (
                  <button
                    key={index}
                    className="popup-close-button"
                    onClick={() => { setShowPopup(false); setPopupContent(null); }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : (
              <button className="popup-close-button" onClick={() => { setShowPopup(false); setPopupContent(null); }}>
                ACKNOWLEDGE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
