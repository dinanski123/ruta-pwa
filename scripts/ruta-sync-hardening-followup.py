from pathlib import Path

p=Path('cloud-sync.js')
s=p.read_text()

def once(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s=s.replace(old,new,1)

once("    const rec=fleet?.vehicles?.[op.vehicleId]; if(!rec?.data)return;\n    const arr=op.type==='fuel'?rec.data.fuel:rec.data.maintenance;\n    const item=Array.isArray(arr)?arr.find(x=>String(x.id)===String(op.id)):null;\n    if(item)item.updatedAt=row.updated_at||item.updatedAt||null;\n", "    const stamp=row.updated_at||null;\n    const rec=fleet?.vehicles?.[op.vehicleId]; if(!rec?.data)return;\n    const arr=op.type==='fuel'?rec.data.fuel:rec.data.maintenance;\n    const item=Array.isArray(arr)?arr.find(x=>String(x.id)===String(op.id)):null;\n    if(item)item.updatedAt=stamp||item.updatedAt||null;\n    if(op.vehicleId===vehicleId){\n      const liveArr=op.type==='fuel'?state.fuel:state.maintenance;\n      const live=Array.isArray(liveArr)?liveArr.find(x=>String(x.id)===String(op.id)):null;\n      if(live)live.updatedAt=stamp||live.updatedAt||null;\n    }\n", 'live version stamp')

once("  async function pushVehicle(){ if(!client||!user||!vehicleId||busy)return; const rec=currentRec(); if(!rec)return; queueVehicle(rec); if(await flushOutbox())status=c('pending_sync'); }\n  async function pushFuel(x,vid=vehicleId){ if(!client||!user||busy||!x)return; queueFuel(x,vid); if(await flushOutbox())status=c('pending_sync'); }\n  async function pushMaint(x,vid=vehicleId){ if(!client||!user||busy||!x)return; queueMaint(x,vid); if(await flushOutbox())status=c('pending_sync'); }\n", "  async function pushVehicle(){ if(!client||!user||!vehicleId)return; const rec=currentRec(); if(!rec)return; queueVehicle(rec); if(busy){status=c('pending_sync');return;} if(await flushOutbox())status=c('pending_sync'); }\n  async function pushFuel(x,vid=vehicleId){ if(!client||!user||!x)return; queueFuel(x,vid); if(busy){status=c('pending_sync');return;} if(await flushOutbox())status=c('pending_sync'); }\n  async function pushMaint(x,vid=vehicleId){ if(!client||!user||!x)return; queueMaint(x,vid); if(busy){status=c('pending_sync');return;} if(await flushOutbox())status=c('pending_sync'); }\n", 'queue while pull busy')

once("      if(v.error) throw v.error; if(f.error) throw f.error; if(m.error) throw m.error;\n\n      const legacyTrips=Array.isArray(state.trips)?state.trips:[];\n", "      if(v.error) throw v.error; if(f.error) throw f.error; if(m.error) throw m.error;\n      if(hasPendingForUser()){ status=c('pending_sync'); return; }\n\n      const legacyTrips=Array.isArray(state.trips)?state.trips:[];\n", 'protect in-flight local edits')

once("    finally{ busy=false; }\n", "    finally{\n      busy=false;\n      if(hasPendingForUser())setTimeout(async()=>{const pending=await flushOutbox();if(!pending)schedulePull();},0);\n    }\n", 'flush queued edits after pull')

p.write_text(s)

sw=Path('service-worker.js')
x=sw.read_text()
if 'ruta-cache-v7-sync-hardening' not in x: raise SystemExit('v7 cache marker missing')
sw.write_text(x.replace('ruta-cache-v7-sync-hardening','ruta-cache-v8-sync-hardening',1))

idx=Path('index.html')
x=idx.read_text()
if 'service-worker.js?v=7-sync-hardening' not in x: raise SystemExit('v7 SW registration marker missing')
idx.write_text(x.replace('service-worker.js?v=7-sync-hardening','service-worker.js?v=8-sync-hardening',1))
