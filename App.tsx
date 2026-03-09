import { useState, useEffect, useRef } from "react";

const PROPERTY_TYPES = ["ที่ดินเปล่า","บ้านเดี่ยว","บ้านแฝด","ทาวน์เฮ้าส์","ตึกแถว/อาคารพาณิชย์","คอนโดมิเนียม","อาคารสำนักงาน","โกดัง/โรงงาน","รีสอร์ท/โรงแรม","อื่นๆ"];
const TRANSACTION = ["ซื้อ-ขาย","เช่า"];
const PRICE_UNITS_BUY  = ["บาท","ล้านบาท"];
const PRICE_UNITS_RENT = ["บาท/เดือน","บาท/ปี","ล้านบาท/ปี"];
const AREA_UNITS = ["ตร.ม.","ตร.วา","ไร่","งาน","ตร.ฟุต"];
const YEARS = Array.from({length:30},(_,i)=>(2568-i).toString());
const PROVINCES = ["กรุงเทพมหานคร","กาญจนบุรี","กาฬสินธุ์","กำแพงเพชร","ขอนแก่น","จันทบุรี","ฉะเชิงเทรา","ชลบุรี","ชัยนาท","ชัยภูมิ","ชุมพร","เชียงราย","เชียงใหม่","ตรัง","ตราด","ตาก","นครนายก","นครปฐม","นครพนม","นครราชสีมา","นครศรีธรรมราช","นครสวรรค์","นนทบุรี","นราธิวาส","น่าน","บึงกาฬ","บุรีรัมย์","ปทุมธานี","ประจวบคีรีขันธ์","ปราจีนบุรี","ปัตตานี","พระนครศรีอยุธยา","พะเยา","พังงา","พัทลุง","พิจิตร","พิษณุโลก","เพชรบุรี","เพชรบูรณ์","แพร่","ภูเก็ต","มหาสารคาม","มุกดาหาร","แม่ฮ่องสอน","ยโสธร","ยะลา","ร้อยเอ็ด","ระนอง","ระยอง","ราชบุรี","ลพบุรี","ลำปาง","ลำพูน","เลย","ศรีสะเกษ","สกลนคร","สงขลา","สตูล","สมุทรปราการ","สมุทรสงคราม","สมุทรสาคร","สระแก้ว","สระบุรี","สิงห์บุรี","สุโขทัย","สุพรรณบุรี","สุราษฎร์ธานี","สุรินทร์","หนองคาย","หนองบัวลำภู","อ่างทอง","อำนาจเจริญ","อุดรธานี","อุตรดิตถ์","อุทัยธานี","อุบลราชธานี"];
const ZONE_TYPES = ["ใจกลางเมือง (CBD)","ชานเมือง","นิคมอุตสาหกรรม","เขตการค้า","ชนบท/เกษตร","ริมทะเล/ท่องเที่ยว","ริมแม่น้ำ","ใกล้สนามบิน","ใกล้รถไฟฟ้า","อื่นๆ"];
const SOURCES = ["ประเมินราคาตลาด","กรมที่ดิน","ประกาศขาย/เช่า","ซื้อขายจริง","ธนาคาร/สถาบันการเงิน","บริษัทประเมิน","อื่นๆ"];
const CONDITIONS = ["ดีมาก","ดี","ปานกลาง","ทรุดโทรม","โครงสร้างเปล่า","ที่ดินเปล่า"];

const EMPTY = {
  propertyType:"", transaction:"", priceValue:"", priceUnit:"", areaValue:"", areaUnit:"",
  year:"", province:"", district:"", subdistrict:"", zoneType:"", source:"", condition:"",
  lat:"", lng:"", note:""
};

function pricePerArea(price: any, priceUnit: any, area: any, areaUnit: any) {
  if (!price || !area) return null;
  let p = parseFloat(price), a = parseFloat(area);
  if (isNaN(p)||isNaN(a)||a===0) return null;
  if (priceUnit?.includes("ล้าน")) p *= 1_000_000;
  // convert to sqm
  const toSqm: any = { "ตร.ม.":1, "ตร.วา":4, "ไร่":1600, "งาน":400, "ตร.ฟุต":0.0929 };
  const sqm = a * (toSqm[areaUnit]||1);
  return (p/sqm).toLocaleString("th-TH",{maximumFractionDigits:0}) + " บาท/ตร.ม.";
}

// Map component using Leaflet via CDN
function MapPicker({ lat, lng, onChange }: any) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const marker = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const linkEl = document.createElement("link");
    linkEl.rel = "stylesheet";
    linkEl.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(linkEl);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !mapRef.current || leafletMap.current) return;
    const L = (window as any).L;
    const initLat = lat && !isNaN(lat) ? parseFloat(lat) : 13.75;
    const initLng = lng && !isNaN(lng) ? parseFloat(lng) : 100.52;

    leafletMap.current = L.map(mapRef.current).setView([initLat, initLng], 12);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(leafletMap.current);

    const icon = L.divIcon({
      className:"",
      html:`<div style="width:24px;height:24px;background:#b45309;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px #0006"></div>`,
      iconSize:[24,24], iconAnchor:[12,24]
    });

    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      marker.current = L.marker([parseFloat(lat), parseFloat(lng)], {icon, draggable:true}).addTo(leafletMap.current);
      marker.current.on("dragend", (e: any) => {
        const {lat:la,lng:lo} = e.target.getLatLng();
        onChange(la.toFixed(6), lo.toFixed(6));
      });
    }

    leafletMap.current.on("click", (e: any) => {
      const {lat:la, lng:lo} = e.latlng;
      if (marker.current) { 
        marker.current.setLatLng([la,lo]); 
      }
      else { 
        marker.current = L.marker([la,lo],{icon,draggable:true}).addTo(leafletMap.current!);
        marker.current.on("dragend", (ev: any) => { const p=ev.target.getLatLng(); onChange(p.lat.toFixed(6),p.lng.toFixed(6)); }); 
      }
      onChange(la.toFixed(6), lo.toFixed(6));
    });
  }, [loaded, lat, lng, onChange]);

  useEffect(() => {
    const L = (window as any).L;
    if (!leafletMap.current || !L) return;
    if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
      const pos: [number, number] = [parseFloat(lat), parseFloat(lng)];
      if (marker.current) { 
        marker.current.setLatLng(pos); 
      }
      else {
        const icon = L.divIcon({ className:"", html:`<div style="width:24px;height:24px;background:#b45309;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px #0006"></div>`, iconSize:[24,24], iconAnchor:[12,24] });
        marker.current = L.marker(pos,{icon,draggable:true}).addTo(leafletMap.current);
        marker.current.on("dragend", (e: any) => { const p=e.target.getLatLng(); onChange(p.lat.toFixed(6),p.lng.toFixed(6)); });
      }
      leafletMap.current.setView(pos, leafletMap.current.getZoom());
    }
  }, [lat, lng, onChange]);

  return (
    <div style={{position:"relative"}}>
      {!loaded && <div style={{height:320,display:"flex",alignItems:"center",justifyContent:"center",background:"#f5f0e8",borderRadius:12,border:"1px dashed #c4a882",color:"#92754a",fontSize:14}}>กำลังโหลดแผนที่…</div>}
      <div ref={mapRef} style={{height:320, borderRadius:12, overflow:"hidden", display: loaded?"block":"none", border:"1px solid #ddd3be"}} />
      <div style={{position:"absolute",bottom:10,left:10,background:"#ffffffcc",backdropFilter:"blur(6px)",borderRadius:8,padding:"6px 12px",fontSize:12,color:"#5c4a2a",fontFamily:"inherit",pointerEvents:"none"}}>
        คลิกบนแผนที่หรือลากหมุดเพื่อระบุตำแหน่ง
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder="— เลือก —", required=false }: any) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:12,fontWeight:600,color:"#7a5c3a",letterSpacing:"0.05em",textTransform:"uppercase"}}>{label}{required&&<span style={{color:"#c0392b",marginLeft:3}}>*</span>}</label>
      <select value={value} onChange={e=>onChange(e.target.value)}
        style={{padding:"11px 14px",borderRadius:10,border:`1.5px solid ${value?"#c4a882":"#e0d5c5"}`,
          background: value?"#fff":"#faf7f2", color: value?"#2c1f0e":"#a08060",
          fontSize:14,fontFamily:"inherit",cursor:"pointer",appearance:"none",
          backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23a08060' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center",paddingRight:36,
          transition:"border-color .15s, background .15s"}}>
        <option value="">{placeholder}</option>
        {options.map((o: any)=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder="", type="text", required=false, suffix="" }: any) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:12,fontWeight:600,color:"#7a5c3a",letterSpacing:"0.05em",textTransform:"uppercase"}}>{label}{required&&<span style={{color:"#c0392b",marginLeft:3}}>*</span>}</label>
      <div style={{position:"relative"}}>
        <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
          style={{width:"100%",padding:"11px 14px",paddingRight: suffix?48:14,borderRadius:10,
            border:`1.5px solid ${value?"#c4a882":"#e0d5c5"}`, background: value?"#fff":"#faf7f2",
            color:"#2c1f0e",fontSize:14,fontFamily:"inherit",boxSizing:"border-box",
            transition:"border-color .15s"}} />
        {suffix && <span style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#a08060"}}>{suffix}</span>}
      </div>
    </div>
  );
}

const SECTION = ({title, icon, children}: any) => (
  <div style={{marginBottom:28}}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}>
      <div style={{width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#c4a882,#b45309)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{icon}</div>
      <div style={{fontSize:16,fontWeight:700,color:"#3d2c1a",letterSpacing:"-0.3px"}}>{title}</div>
      <div style={{flex:1,height:1,background:"linear-gradient(90deg,#e0d5c5,transparent)",marginLeft:8}}></div>
    </div>
    {children}
  </div>
);

export default function App() {
  const [form, setForm] = useState<any>({...EMPTY, year: YEARS[0]});
  const [records, setRecords] = useState<any[]>([]);
  const [view, setView] = useState("form");
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [editId, setEditId] = useState<any>(null);
  const [search, setSearch] = useState("");

  const set = (key: string) => (val: any) => setForm((f: any) => ({...f, [key]: val}));

  const priceUnits = form.transaction === "เช่า" ? PRICE_UNITS_RENT : PRICE_UNITS_BUY;

  const validate = () => {
    const e: any = {};
    if (!form.propertyType) e.propertyType = true;
    if (!form.transaction)  e.transaction = true;
    if (!form.priceValue)   e.priceValue = true;
    if (!form.areaValue)    e.areaValue = true;
    if (!form.year)         e.year = true;
    if (!form.province)     e.province = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const rec = { ...form, id: editId || Date.now(), savedAt: new Date().toLocaleString("th-TH") };
    if (editId) setRecords(r => r.map(x => x.id===editId ? rec : x));
    else setRecords(r => [rec, ...r]);
    setForm({...EMPTY, year: YEARS[0]});
    setEditId(null);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2000);
  };

  const handleEdit = (rec: any) => {
    setForm({...rec});
    setEditId(rec.id);
    setView("form");
    window.scrollTo({top:0,behavior:"smooth"});
  };

  const handleDelete = (id: any) => setRecords(r => r.filter(x=>x.id!==id));

  const filtered = records.filter(r =>
    !search || [r.propertyType,r.province,r.district,r.transaction,r.note].some(v=>v?.includes(search))
  );

  const ppa = pricePerArea(form.priceValue, form.priceUnit, form.areaValue, form.areaUnit);

  return (
    <div style={{minHeight:"100vh",background:"#f5f0e8",fontFamily:"'Cormorant Garamond','Sarabun','Noto Sans Thai',serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#2c1f0e 0%,#4a3120 60%,#6b4423 100%)",padding:"0 0 0 0",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 24px #0004"}}>
        <div style={{maxWidth:900,margin:"0 auto",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:22,fontWeight:700,color:"#f5deb3",letterSpacing:"-0.5px"}}>🏡 ระบบข้อมูลราคาอสังหาริมทรัพย์</div>
            <div style={{fontSize:12,color:"#c4a882",marginTop:2,fontFamily:"Sarabun,sans-serif"}}>Real Estate Price Registry</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {["form","list"].map(v=>(
              <button key={v} onClick={()=>setView(v)}
                style={{padding:"8px 20px",borderRadius:8,fontWeight:600,fontSize:13,fontFamily:"Sarabun,sans-serif",cursor:"pointer",transition:"all .2s",
                  background: view===v?"#c4a882":"transparent", color: view===v?"#2c1f0e":"#c4a882",
                  border: view===v?"none":"1px solid #c4a88260"}}>
                {v==="form"?(editId?"✏️ แก้ไข":"📝 กรอกข้อมูล"):`📋 รายการ (${records.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px"}}>

        {/* ===== FORM ===== */}
        {view === "form" && (
          <div>
            {editId && (
              <div style={{background:"#fef3c7",border:"1px solid #f59e0b",borderRadius:12,padding:"12px 18px",marginBottom:24,fontSize:14,color:"#92400e",fontFamily:"Sarabun,sans-serif"}}>
                ✏️ กำลังแก้ไขข้อมูล — <button onClick={()=>{setForm({...EMPTY,year:YEARS[0]});setEditId(null);setErrors({});}} style={{color:"#92400e",textDecoration:"underline",background:"none",border:"none",cursor:"pointer",fontFamily:"inherit"}}>ยกเลิก</button>
              </div>
            )}

            <div style={{background:"#fff",borderRadius:20,padding:32,boxShadow:"0 8px 40px #0002",border:"1px solid #e8dccf"}}>

              <SECTION title="ประเภทและรูปแบบธุรกรรม" icon="🏠">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <SelectField label="ประเภทอสังหาริมทรัพย์" value={form.propertyType} onChange={set("propertyType")} options={PROPERTY_TYPES} required/>
                  <SelectField label="รูปแบบธุรกรรม" value={form.transaction} onChange={(v: any)=>{set("transaction")(v);set("priceUnit")("");}} options={TRANSACTION} required/>
                </div>
              </SECTION>

              <SECTION title="ราคาและพื้นที่" icon="💰">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:16}}>
                  <InputField label="ราคา" value={form.priceValue} onChange={set("priceValue")} placeholder="0" type="number" required/>
                  <SelectField label="หน่วยราคา" value={form.priceUnit} onChange={set("priceUnit")} options={priceUnits}/>
                  <InputField label="ขนาดพื้นที่" value={form.areaValue} onChange={set("areaValue")} placeholder="0" type="number" required/>
                  <SelectField label="หน่วยพื้นที่" value={form.areaUnit} onChange={set("areaUnit")} options={AREA_UNITS}/>
                </div>
                {ppa && (
                  <div style={{marginTop:12,padding:"10px 16px",borderRadius:10,background:"linear-gradient(90deg,#fef9f0,#fdf5e6)",border:"1px solid #e8d5b0",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,color:"#7a5c3a",fontFamily:"Sarabun,sans-serif"}}>📊 ราคาต่อ ตร.ม. :</span>
                    <span style={{fontSize:16,fontWeight:700,color:"#b45309"}}>{ppa}</span>
                  </div>
                )}
                <div style={{marginTop:16}}>
                  <SelectField label="ปีอ้างอิงราคา (พ.ศ.)" value={form.year} onChange={set("year")} options={YEARS} required/>
                </div>
                <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <SelectField label="แหล่งข้อมูลราคา" value={form.source} onChange={set("source")} options={SOURCES}/>
                  <SelectField label="สภาพทรัพย์สิน" value={form.condition} onChange={set("condition")} options={CONDITIONS}/>
                </div>
              </SECTION>

              <SECTION title="ที่ตั้งและโซน" icon="📍">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
                  <SelectField label="จังหวัด" value={form.province} onChange={set("province")} options={PROVINCES} required/>
                  <InputField label="อำเภอ/เขต" value={form.district} onChange={set("district")} placeholder="ชื่ออำเภอหรือเขต"/>
                  <InputField label="ตำบล/แขวง" value={form.subdistrict} onChange={set("subdistrict")} placeholder="ชื่อตำบลหรือแขวง"/>
                </div>
                <div style={{marginBottom:16}}>
                  <SelectField label="ประเภทโซนทำเล" value={form.zoneType} onChange={set("zoneType")} options={ZONE_TYPES}/>
                </div>

                {/* Coordinate inputs */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                  <InputField label="ละติจูด (Latitude)" value={form.lat} onChange={(v: any)=>{set("lat")(v);}} placeholder="เช่น 13.756331" type="number"/>
                  <InputField label="ลองจิจูด (Longitude)" value={form.lng} onChange={(v: any)=>{set("lng")(v);}} placeholder="เช่น 100.501765" type="number"/>
                </div>

                <MapPicker lat={form.lat} lng={form.lng} onChange={(la: any,lo: any)=>{ set("lat")(la); set("lng")(lo); }}/>

                {form.lat && form.lng && (
                  <div style={{marginTop:10,padding:"8px 14px",borderRadius:8,background:"#f0fdf4",border:"1px solid #86efac",fontSize:13,color:"#166534",fontFamily:"Sarabun,sans-serif",display:"flex",gap:6,alignItems:"center"}}>
                    📌 พิกัด: {parseFloat(form.lat).toFixed(6)}, {parseFloat(form.lng).toFixed(6)}
                    <a href={`http://www.google.com/maps?q=${form.lat},${form.lng}`} target="_blank" rel="noreferrer"
                      style={{marginLeft:"auto",color:"#15803d",fontSize:12,textDecoration:"none",background:"#dcfce7",padding:"3px 10px",borderRadius:6}}>
                      เปิด Google Maps ↗
                    </a>
                  </div>
                )}
              </SECTION>

              <SECTION title="หมายเหตุ" icon="📝">
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  <label style={{fontSize:12,fontWeight:600,color:"#7a5c3a",letterSpacing:"0.05em",textTransform:"uppercase",fontFamily:"Sarabun,sans-serif"}}>หมายเหตุเพิ่มเติม</label>
                  <textarea value={form.note} onChange={e=>set("note")(e.target.value)} rows={4}
                    placeholder="ข้อมูลเพิ่มเติม เช่น สภาพแวดล้อม การเข้าถึง เงื่อนไขพิเศษ แหล่งอ้างอิง..."
                    style={{padding:"12px 14px",borderRadius:10,border:"1.5px solid #e0d5c5",background:"#faf7f2",
                      color:"#2c1f0e",fontSize:14,fontFamily:"Sarabun,sans-serif",resize:"vertical",lineHeight:1.7,
                      transition:"border-color .15s"}}/>
                </div>
              </SECTION>

              {/* Validation errors */}
              {Object.keys(errors).length > 0 && (
                <div style={{padding:"12px 18px",borderRadius:10,background:"#fff1f2",border:"1px solid #fca5a5",marginBottom:20,fontSize:13,color:"#991b1b",fontFamily:"Sarabun,sans-serif"}}>
                  ⚠️ กรุณากรอกข้อมูลที่จำเป็น: {["propertyType","transaction","priceValue","areaValue","year","province"].filter(k=>errors[k]).map(k=>({propertyType:"ประเภท",transaction:"รูปแบบ",priceValue:"ราคา",areaValue:"พื้นที่",year:"ปี",province:"จังหวัด"}[k as keyof any] as string)).join(", ")}
                </div>
              )}

              <div style={{display:"flex",justifyContent:"flex-end",gap:12}}>
                <button onClick={()=>{setForm({...EMPTY,year:YEARS[0]});setEditId(null);setErrors({});}}
                  style={{padding:"13px 28px",borderRadius:12,background:"#f5f0e8",color:"#7a5c3a",fontWeight:600,fontSize:15,border:"1px solid #e0d5c5",cursor:"pointer",fontFamily:"Sarabun,sans-serif"}}>
                  ล้างข้อมูล
                </button>
                <button onClick={handleSave}
                  style={{padding:"13px 36px",borderRadius:12,fontWeight:700,fontSize:15,border:"none",cursor:"pointer",fontFamily:"Sarabun,sans-serif",transition:"all .2s",letterSpacing:"-0.2px",
                    background: saved ? "linear-gradient(135deg,#166534,#15803d)" : "linear-gradient(135deg,#b45309,#92400e)",
                    color:"#fff",boxShadow: saved?"0 4px 16px #16653440":"0 4px 16px #b4530940"}}>
                  {saved ? "✅ บันทึกแล้ว!" : editId ? "💾 บันทึกการแก้ไข" : "💾 บันทึกข้อมูล"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== LIST ===== */}
        {view === "list" && (
          <div>
            <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center"}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 ค้นหา ประเภท จังหวัด หมายเหตุ..."
                style={{flex:1,padding:"11px 16px",borderRadius:12,border:"1.5px solid #e0d5c5",background:"#fff",
                  color:"#2c1f0e",fontSize:14,fontFamily:"Sarabun,sans-serif"}}/>
              <div style={{fontSize:13,color:"#7a5c3a",fontFamily:"Sarabun,sans-serif",whiteSpace:"nowrap"}}>
                {filtered.length}/{records.length} รายการ
              </div>
            </div>

            {filtered.length === 0 ? (
              <div style={{textAlign:"center",padding:"80px 20px",color:"#c4a882"}}>
                <div style={{fontSize:56,marginBottom:16}}>🏡</div>
                <div style={{fontSize:18,fontWeight:600,marginBottom:8,color:"#7a5c3a"}}>{records.length===0?"ยังไม่มีข้อมูล":"ไม่พบรายการที่ค้นหา"}</div>
                <div style={{fontSize:14,fontFamily:"Sarabun,sans-serif"}}>{records.length===0&&"กดปุ่ม 'กรอกข้อมูล' เพื่อเพิ่มรายการแรก"}</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {filtered.map(rec => (
                  <div key={rec.id} style={{background:"#fff",borderRadius:16,padding:24,border:"1px solid #e8dccf",boxShadow:"0 2px 12px #0001",transition:"box-shadow .2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                        <span style={{padding:"4px 12px",borderRadius:20,background:"#2c1f0e",color:"#f5deb3",fontSize:12,fontWeight:600,fontFamily:"Sarabun,sans-serif"}}>{rec.propertyType}</span>
                        <span style={{padding:"4px 12px",borderRadius:20,background: rec.transaction==="เช่า"?"#1e3a5f":"#166534",color:"#fff",fontSize:12,fontWeight:600,fontFamily:"Sarabun,sans-serif"}}>{rec.transaction}</span>
                        {rec.year && <span style={{padding:"4px 12px",borderRadius:20,background:"#f5f0e8",color:"#7a5c3a",fontSize:12,fontFamily:"Sarabun,sans-serif"}}>พ.ศ. {rec.year}</span>}
                      </div>
                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>handleEdit(rec)}
                          style={{padding:"6px 14px",borderRadius:8,background:"#fef3c7",color:"#92400e",fontSize:12,border:"1px solid #f59e0b40",cursor:"pointer",fontFamily:"Sarabun,sans-serif",fontWeight:600}}>แก้ไข</button>
                        <button onClick={()=>handleDelete(rec.id)}
                          style={{padding:"6px 14px",borderRadius:8,background:"#fff1f2",color:"#991b1b",fontSize:12,border:"1px solid #fca5a540",cursor:"pointer",fontFamily:"Sarabun,sans-serif",fontWeight:600}}>ลบ</button>
                      </div>
                    </div>

                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom: rec.note||rec.lat?14:0}}>
                      {[
                        ["💰 ราคา", rec.priceValue ? `${parseFloat(rec.priceValue).toLocaleString()} ${rec.priceUnit||"บาท"}` : "-"],
                        ["📐 พื้นที่", rec.areaValue ? `${parseFloat(rec.areaValue).toLocaleString()} ${rec.areaUnit||"ตร.ม."}` : "-"],
                        ["📊 ราคา/ตร.ม.", pricePerArea(rec.priceValue,rec.priceUnit,rec.areaValue,rec.areaUnit)||"-"],
                        ["📍 ที่ตั้ง", [rec.province,rec.district].filter(Boolean).join(" / ")||"-"],
                        ...(rec.zoneType?[["🏙 โซน", rec.zoneType]]:[]),
                        ...(rec.condition?[["🔧 สภาพ", rec.condition]]:[]),
                        ...(rec.source?[["📄 แหล่งข้อมูล", rec.source]]:[]),
                      ].map(([label,val])=>(
                        <div key={label} style={{padding:"10px 14px",borderRadius:10,background:"#faf7f2",border:"1px solid #f0e8da"}}>
                          <div style={{fontSize:11,color:"#a08060",marginBottom:4,fontFamily:"Sarabun,sans-serif"}}>{label}</div>
                          <div style={{fontSize:14,fontWeight:600,color:"#3d2c1a"}}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {(rec.lat && rec.lng) && (
                      <div style={{marginBottom:10,padding:"8px 14px",borderRadius:8,background:"#f0fdf4",border:"1px solid #86efac",fontSize:12,color:"#166534",fontFamily:"Sarabun,sans-serif",display:"flex",gap:8,alignItems:"center"}}>
                        📌 {parseFloat(rec.lat).toFixed(6)}, {parseFloat(rec.lng).toFixed(6)}
                        <a href={`http://www.google.com/maps?q=${rec.lat},${rec.lng}`} target="_blank" rel="noreferrer"
                          style={{marginLeft:"auto",color:"#15803d",fontSize:11,textDecoration:"none",background:"#dcfce7",padding:"2px 8px",borderRadius:5}}>Google Maps ↗</a>
                      </div>
                    )}

                    {rec.note && (
                      <div style={{padding:"10px 14px",borderRadius:10,background:"#f5f0e8",border:"1px solid #e8d5b0",fontSize:13,color:"#5c4a2a",fontFamily:"Sarabun,sans-serif",lineHeight:1.6}}>
                        📝 {rec.note}
                      </div>
                    )}

                    <div style={{marginTop:10,fontSize:11,color:"#c4a882",fontFamily:"Sarabun,sans-serif",textAlign:"right"}}>บันทึกเมื่อ {rec.savedAt}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}