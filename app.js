(() => {
  let blocks = [];
  let characters = [];
  let selectedIndex = -1;
  let dirty = false;

  const $ = id => document.getElementById(id);

  const el = {
    sceneId: $("sceneId"),
    metaText: $("metaText"),
    blockList: $("blockList"),
    blockId: $("blockId"),
    blockType: $("blockType"),
    speaker: $("speaker"),
    speakerRow: $("speakerRow"),
    text: $("text"),
    btnAdd: $("btnAdd"),
    btnDelete: $("btnDelete"),
    btnUp: $("btnUp"),
    btnDown: $("btnDown"),
    btnExport: $("btnExport"),
    fileImport: $("fileImport"),
    charList: $("charList"),
    charInput: $("charInput"),
    btnAddChar: $("btnAddChar"),
    btnBold: $("btnBold")
  };

  function setDirty(v){
    dirty = v;
    el.metaText.textContent = v ? "未保存" : "保存済み";
  }

  function nextId(){
    let max = 0;
    blocks.forEach(b=>{
      const m = /block_(\d+)/.exec(b.id);
      if(m) max = Math.max(max, +m[1]);
    });
    return "block_" + String(max+1).padStart(3,"0");
  }

  /* ---------- text decoration ---------- */

  function wrapSelection(prefix, suffix){
    const ta = el.text;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if(start === end) return;

    const before = ta.value.slice(0, start);
    const selected = ta.value.slice(start, end);
    const after = ta.value.slice(end);

    ta.value = before + prefix + selected + suffix + after;
    ta.focus();
    ta.selectionStart = start;
    ta.selectionEnd = end + prefix.length + suffix.length;

    blocks[selectedIndex].text = ta.value;
    setDirty(true);
    renderList();
  }

  el.btnBold.onclick = () => {
    wrapSelection("<b>", "</b>");
  };

  document.querySelectorAll(".text-toolbar .color").forEach(btn=>{
    btn.onclick = () => {
      const color = btn.dataset.color;
      wrapSelection(`<color=${color}>`, "</color>");
    };
  });

  /* ---------- render ---------- */

  function renderCharList(){
    el.charList.innerHTML = "";
    characters.forEach(name=>{
      const row = document.createElement("div");
      row.className = "char-item";

      const label = document.createElement("div");
      label.className = "char-name";
      label.textContent = name;

      const del = document.createElement("button");
      del.className = "char-delete";
      del.textContent = "×";

      del.onclick = () => {
        if(blocks.some(b=>b.speaker===name)){
          alert("使用中のキャラは削除できません");
          return;
        }
        if(!confirm(`キャラ「${name}」を削除しますか？`)) return;
        characters = characters.filter(c=>c!==name);
        setDirty(true);
        renderAll();
      };

      row.appendChild(label);
      row.appendChild(del);
      el.charList.appendChild(row);
    });
  }

  function renderSpeakerOptions(){
    el.speaker.innerHTML = "";
    characters.forEach(c=>{
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      el.speaker.appendChild(o);
    });
  }

  function renderList(){
    el.blockList.innerHTML = "";
    blocks.forEach((b,i)=>{
      const d = document.createElement("div");
      d.className = "item" + (i===selectedIndex?" active":"");
      d.textContent = `${b.id} : ${b.text.slice(0,20)}`;
      d.onclick = ()=>{ selectedIndex=i; renderAll(); };
      el.blockList.appendChild(d);
    });
  }

  function renderEditor(){
    const b = blocks[selectedIndex];
    if(!b) return;

    el.blockId.value = b.id;
    el.blockType.value = b.type;
    el.text.value = b.text || "";

    if(b.type==="dialogue"){
      el.speakerRow.style.display="grid";
      renderSpeakerOptions();
      el.speaker.value = b.speaker || characters[0] || "";
    }else{
      el.speakerRow.style.display="none";
    }
  }

  function renderAll(){
    renderCharList();
    renderList();
    renderEditor();
  }

  /* ---------- operations ---------- */

  el.btnAdd.onclick = () => {
    blocks.push({
      id: nextId(),
      type: "dialogue",
      speaker: characters[0] || "",
      text: ""
    });
    selectedIndex = blocks.length-1;
    setDirty(true);
    renderAll();
  };

  el.btnDelete.onclick = () => {
    if(selectedIndex < 0) return;
    if(!confirm("このブロックを削除しますか？")) return;
    blocks.splice(selectedIndex,1);
    selectedIndex = Math.min(selectedIndex, blocks.length-1);
    setDirty(true);
    renderAll();
  };

  el.btnUp.onclick = () => {
    if(selectedIndex<=0) return;
    [blocks[selectedIndex-1],blocks[selectedIndex]] =
      [blocks[selectedIndex],blocks[selectedIndex-1]];
    selectedIndex--;
    setDirty(true);
    renderAll();
  };

  el.btnDown.onclick = () => {
    if(selectedIndex<0 || selectedIndex>=blocks.length-1) return;
    [blocks[selectedIndex],blocks[selectedIndex+1]] =
      [blocks[selectedIndex+1],blocks[selectedIndex]];
    selectedIndex++;
    setDirty(true);
    renderAll();
  };

  el.blockType.onchange = () => {
    const b = blocks[selectedIndex];
    b.type = el.blockType.value;
    if(b.type==="narration") delete b.speaker;
    setDirty(true);
    renderAll();
  };

  el.speaker.onchange = () => {
    blocks[selectedIndex].speaker = el.speaker.value;
    setDirty(true);
  };

  el.text.oninput = () => {
    blocks[selectedIndex].text = el.text.value;
    setDirty(true);
    renderList();
  };

  el.btnAddChar.onclick = () => {
    const name = el.charInput.value.trim();
    if(!name || characters.includes(name)) return;
    characters.push(name);
    el.charInput.value="";
    setDirty(true);
    renderAll();
  };

  /* ---------- import / export ---------- */

  el.btnExport.onclick = () => {
    const map = {};
    blocks.forEach((b,i)=>{
      map[b.id] = {...b, next: blocks[i+1]?.id||null};
    });

    const obj = {
      sceneId: el.sceneId.value,
      characters,
      entry: blocks[0]?.id||null,
      blocks: map
    };

    const blob = new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = obj.sceneId + ".json";
    a.click();
    setDirty(false);
  };

  el.fileImport.onchange = () => {
    const file = el.fileImport.files[0];
    if(!file) return;
    const r = new FileReader();
    r.onload = () => {
      const obj = JSON.parse(r.result);
      characters = obj.characters || [];
      blocks = [];
      let cur = obj.entry;
      while(cur && obj.blocks[cur]){
        const b = obj.blocks[cur];
        blocks.push({...b, id:cur});
        cur = b.next;
      }
      selectedIndex = blocks.length?0:-1;
      setDirty(false);
      renderAll();
    };
    r.readAsText(file);
  };

  /* ---------- init ---------- */

  function init(){
    characters = ["アリス","ボブ"];
    blocks = [
      {id:"block_001",type:"dialogue",speaker:"アリス",text:"今日は<b>いい</b>天気ね。"},
      {id:"block_002",type:"narration",text:"空は<color=#5aa9ff>どこまでも</color>青かった。"},
      {id:"block_003",type:"dialogue",speaker:"ボブ",text:"散歩日和だな。"}
    ];
    selectedIndex = 0;
    renderAll();
  }

  init();
})();
