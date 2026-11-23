/* ==================================================================
   VIP RAQAMLAR — IKKINCHI QISM  (V157)
   ------------------------------------------------------------------
   NEGA ALOHIDA FAYL.
   O'lchandi: arzon telefonda (6 barobar sekin protsessor, 1,6 Mbit)
   `app.js` ni yuklab, o'qib chiqish 913 ms olardi — butun kutishning
   yarmidan ko'pi. Holbuki birinchi ekranda faqat bosh sahifa va
   katalog kerak: buyurtma oqimi, kabinet, shartnoma, xabarlar va
   story ko'rish oynasi mijoz BIROR NARSANI BOSMAGUNCHA umuman
   ishlatilmaydi. Ular shu faylga ko'chirildi.

   QACHON YUKLANADI.
     * birinchi chizishdan keyin, bo'sh vaqtda — o'zi;
     * yoki mijoz shu bo'limlardan birini bosganda — darhol.
   Ya'ni odatda u ALLAQACHON tayyor bo'ladi, lekin birinchi ekranni
   kutdirmaydi.

   QANDAY ISHLAYDI.
   Bu ham oddiy skript (modul emas), shuning uchun `app.js` dagi
   barcha o'zgaruvchi va funksiyalar bu yerda ham ko'rinadi. Bu
   yerdagi funksiya e'lonlari esa `app.js` dagi vaqtinchalik
   "o'rinbosar"larni almashtiradi (qarang: app.js -> ikkinchiQism).
   ================================================================== */

/* ==================================================================
   BUYURTMA
   ================================================================== */
const ORD = {
  item:null, step:1, paymentType:'cash', months:6, monthly:0, down:0,
  name:'', phoneRaw:'', region:'', location:null, orderId:null
};
const STEP_TITLES = ['Buyurtma xulosasi',"Ma'lumotlaringiz",'Tasdiqlash','SMS tasdiq','Buyurtma qabul qilindi'];

function openOrder(id){
  const item = findItem(id); if(!item || item.reserved) return;
  /* TUZATISH (V119): bu yerda ilgari `trackNumOrder` turardi — ya'ni
     mijoz formani shunchaki OCHSA ham "buyurtma berildi" deb
     sanalardi. Natijada buyurtma soni haqiqatdan katta chiqardi va
     "formani ochdi-yu yubormadi" degan holat umuman ko'rinmasdi.
     Endi bu yerda FORMA OCHILDI qadami sanaladi; haqiqiy buyurtma esa
     faqat yozuv muvaffaqiyatli bo'lgandan keyin (pastda). */
  try{ trackFormaOchildi(item); }catch(e){}
  Object.assign(ORD, { item, step:1, paymentType: (item.installment && installmentAllowed(item)) ? 'installment' : 'cash',
    months:6, monthly:0, down:0, location:null, orderId:null, sorovId:null });
  try{
    ORD.name = localStorage.getItem('vip_name') || '';
    ORD.phoneRaw = localStorage.getItem('vip_phone') || '';
    ORD.region = localStorage.getItem('vip_region') || '';
  }catch(e){}
  recalcMonthly(); $('#ordStepsWrap').style.display = '';
  renderOrder(); openSheet('shOrder');
}
function recalcMonthly(){
  const it = ORD.item; if(!it) return;
  ORD.monthly = oylikTolov(it, ORD.months);
  ORD.down    = oylikBoshTolov(it, ORD.months);
}
function finalPrice(){ return Math.max(0, (ORD.item.price||0)); }

function setSteps(n){
  $$('#ordSteps .s').forEach((s,i)=>{
    s.classList.toggle('on', i === n-1); s.classList.toggle('ok', i < n-1);
    s.querySelector('b').innerHTML = i < n-1
      ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-10"></path></svg>'
      : String(i+1);
  });
}

function renderOrder(){
  const it = ORD.item; if(!it) return;
  if(ORD.step <= 3) setSteps(ORD.step);
  $('#ordTitle').textContent = t(STEP_TITLES[ORD.step-1] || 'Buyurtma');
  const body = $('#ordBody'), foot = $('#ordFoot');
  /* V149: bu bosqich chizilgach Telegram tugmasi yangilanadi */
  setTimeout(()=> tgOynaTugmasi('#ordFoot'), 0);

  /* ---- 1: raqam va to'lov turi ---- */
  if(ORD.step === 1){
    const fin = installmentFinancingFor(it);
    const canIns = installmentAllowed(it);
    const months = oylikMuddatlar(it);
    body.innerHTML = `
      <div class="card">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="width:46px;height:46px;border-radius:14px;background:var(--navy-grad);display:flex;align-items:center;justify-content:center;flex:none">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="#E6C877" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h10a1.5 1.5 0 0 1 1.5 1.5v15A1.5 1.5 0 0 1 17 21H7a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 7 3z"></path><path d="M10.5 18h3"></path></svg>
          </span>
          <div style="flex:1;min-width:0">
            <div class="sg" style="font-size:21px;font-weight:700">${esc(shortNumber(it.number))}</div>
            <div style="margin-top:7px;display:flex;align-items:center;gap:8px">
              ${it.featured?`<span class="tag vip">${t('VIP')}</span>`:''}
              <span class="nc-op"><i style="background:${opMeta(it.operator).color}"></i>${esc(it.operator||'')}</span>
            </div>
          </div>
        </div>
      </div>

      ${!canIns ? '' : `
      <div class="card" style="margin-top:12px">
        <div class="eyebrow">${t("To'lov usuli")}</div>
        <div style="margin-top:12px;display:flex;gap:9px">
          ${['cash','installment'].map(p => `<button data-pay="${p}" style="flex:1;padding:13px 10px;border-radius:14px;border:1.5px solid ${ORD.paymentType===p?'var(--blue)':'var(--line-2)'};background:${ORD.paymentType===p?'var(--blue-tint)':'var(--card)'};text-align:center">
            <span style="display:block;font-size:13.5px;font-weight:${ORD.paymentType===p?'800':'700'};color:${ORD.paymentType===p?'var(--blue-ink)':'var(--text-2)'}">${p==='cash'?t("To'liq to'lov"):t("Bo'lib to'lash")}</span>
            <span style="display:block;margin-top:3px;font-size:10.5px;font-weight:650;color:var(--muted-2)">${p==='cash'?t('Bir martada'):months[0]+'–'+months[months.length-1]+' '+t('oy')}</span>
          </button>`).join('')}
        </div>
        ${(ORD.paymentType==='installment') ? `
        <div style="margin-top:14px">
          <div class="eyebrow">${t('Muddat')}</div>
          <div style="margin-top:10px;display:grid;grid-template-columns:repeat(${months.length},minmax(0,1fr));gap:8px">
            ${months.map(m => `<button data-mon="${m}" style="padding:11px 4px;border-radius:12px;border:1.5px solid ${ORD.months===m?'var(--blue)':'var(--line-2)'};background:${ORD.months===m?'var(--blue-tint)':'var(--card)'};font-size:13px;font-weight:${ORD.months===m?'800':'650'};color:${ORD.months===m?'var(--blue-ink)':'var(--text-2)'}">${m} ${t('oy')}</button>`).join('')}
          </div>
          <div style="margin-top:13px;background:var(--card-2);border-radius:13px;padding:13px 14px">
            <div style="display:flex;align-items:baseline"><span style="flex:1;font-size:12.5px;color:var(--text-3);font-weight:650">${t("Oylik to'lov")}</span><span class="sg" style="font-size:17px;font-weight:700;color:var(--blue-text)">${formatPrice(ORD.monthly)} ${SUM()}</span></div>
            ${ORD.down?`<div style="margin-top:8px;display:flex;align-items:baseline"><span style="flex:1;font-size:12.5px;color:var(--text-3);font-weight:650">${t("Bosh to'lov")}</span><span class="sg" style="font-size:14px;font-weight:700">${formatPrice(ORD.down)} ${SUM()}</span></div>`:''}
          </div>
        </div>` : ''}
      </div>`}


      <div class="card" style="margin-top:12px">
        <div style="display:flex;flex-direction:column;gap:10px">
          ${ORD.paymentType === 'installment' ? '' : `<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Raqam narxi')}</span><span class="sg" style="font-size:13.5px;font-weight:700">${formatPrice(it.price)}${isUsd(it)?' $':''}</span></div>`}
          <div style="height:1px;background:var(--line-3)"></div>
          <div style="display:flex;align-items:baseline"><span style="flex:1;font-size:14.5px;font-weight:800">${ORD.paymentType==='installment'?t('Oyiga'):t('Jami')}</span><span class="sg" style="font-size:20px;font-weight:700">${ORD.paymentType==='installment'?formatPrice(ORD.monthly):formatPrice(finalPrice())} ${(ORD.paymentType!=='installment'&&isUsd(ORD.item))?'<span class="cur-usd">$</span>':`<span style="font-family:'Plus Jakarta Sans';font-size:12px;color:var(--muted-2);font-weight:600">${SUM()}</span>`}</span></div>
        </div>
      </div>`;
    foot.innerHTML = `<button class="btn" data-ostep="2">${t('Davom etish')}
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"></path></svg></button>`;
    return;
  }

  /* ---- 2: mijoz ma'lumotlari + xarita ---- */
  if(ORD.step === 2){
    body.innerHTML = `
      <div style="background:var(--blue-tint);border-radius:14px;padding:12px 14px;display:flex;gap:10px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--blue-text)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-top:1px"><path d="M12 3l7 3.2v5.1c0 4.3-2.9 7.3-7 8.7-4.1-1.4-7-4.4-7-8.7V6.2z"></path><path d="M9.3 12.2l1.9 1.9 3.6-3.8"></path></svg>
        <div style="font-size:11.5px;color:var(--blue-ink);font-weight:600;line-height:1.5">${LANG==='ru'?'Данные используются только для оформления официального договора и не передаются третьим лицам.':"Ma'lumotlaringiz faqat rasmiy shartnomani to'ldirish uchun ishlatiladi va uchinchi shaxslarga berilmaydi."}</div>
      </div>

      <div class="fld" style="margin-top:14px" id="fName">
        <label for="inName">${t('Ism familiyangiz')}</label>
        <div class="inp">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.4"></circle><path d="M5 20c0-3.7 3.1-6.2 7-6.2s7 2.5 7 6.2"></path></svg>
          <input id="inName" type="text" placeholder="ASADBEK RUSTAMOV" value="${esc(ORD.name)}" autocomplete="name" data-upper autocapitalize="characters" spellcheck="false">
        </div>
        <div class="err"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v6M12 16.5v.5"></path></svg><span>${t('Ismingizni kiriting')}</span></div>
      </div>

      <div class="fld" style="margin-top:12px" id="fPhone">
        <label for="inPhone">${t('Ishlab turgan telefon raqamingiz')}</label>
        <div class="inp">
          <span class="sg" style="font-size:14.5px;font-weight:700;color:var(--text-3)">+998</span>
          <span style="width:1px;height:22px;background:var(--line-2)"></span>
          <input id="inPhone" type="tel" inputmode="numeric" placeholder="90 123 45 67" value="${esc(formatUzNumber(ORD.phoneRaw))}" autocomplete="tel">
        </div>
        <div class="hint">${t('Tasdiqlash uchun shu raqamga SMS kod yuboriladi')}</div>
        <div class="err"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v6M12 16.5v.5"></path></svg><span id="phoneErr">${t("To'g'ri raqam kiriting")}</span></div>
      </div>

      <div class="fld" style="margin-top:12px" id="fRegion">
        <label for="inRegion">${t('Viloyat')}</label>
        <div class="inp">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"></path><circle cx="12" cy="10" r="2.3"></circle></svg>
          <select id="inRegion"><option value="">${t('Tanlang')}</option>${REGIONS.map(r => `<option value="${esc(r)}"${ORD.region===r?' selected':''}>${esc(r)}</option>`).join('')}</select>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--faint)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>
        </div>
        <div class="err"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7.5v6M12 16.5v.5"></path></svg><span>${t('Viloyatni tanlang')}</span></div>
      </div>

      <div id="mapWrap" style="margin-top:14px;display:none">
        <div class="eyebrow">${t('Yetkazib berish manzili')}</div>
        <div style="margin-top:9px;font-size:11.5px;color:var(--muted-2);font-weight:600">${LANG==='ru'?'Двигайте карту — метка в центре. Или нажмите «Моё местоположение».':"Xaritani suring — belgi markazda turadi. Yoki «Mening joylashuvim»ni bosing."}</div>
        <div id="mapBox" style="margin-top:10px"></div>
        <button type="button" class="btn ghost" id="geoBtn" style="margin-top:10px;height:48px;font-size:14px">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"></path><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1.6" fill="currentColor"></circle></svg>
          ${t('Mening joylashuvim')}
        </button>
        <div id="mapAddr" style="margin-top:9px;font-size:12.5px;font-weight:650;color:var(--text-2)"></div>
      </div>

      <div class="card" style="margin-top:14px;display:flex;gap:11px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-top:1px"><rect x="5" y="3" width="14" height="18" rx="2"></rect><path d="M9 8h6M9 12h6M9 16h3"></path></svg>
        <div style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.55">${LANG==='ru'?'Курьер привезёт <b>официальный договор</b> и SIM-карту. Подготовьте паспорт.':"Kuryer bilan birga <b>rasmiy shartnoma</b> va SIM-karta keladi. Pasportingizni tayyorlab qo'ying."}</div>
      </div>`;
    foot.innerHTML = `<button class="btn ghost" data-ostep="1" style="flex:none;width:100px">${t('Orqaga')}</button>
      <button class="btn" data-ostep="3" style="flex:1">${t('Davom etish')}</button>`;
    setTimeout(()=>{ bindPhoneMask(); bindRegion(); if(typeof upperAll === 'function') upperAll(); }, 0);
    return;
  }

  /* ---- 3: tasdiqlash ---- */
  if(ORD.step === 3){
    body.innerHTML = `
      <div class="card">
        <div class="eyebrow">${t('Buyurtma')}</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:11px">
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Raqam')}</span><span class="sg" style="font-size:14.5px;font-weight:700">${esc(shortNumber(ORD.item.number))}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Operator')}</span><span style="font-size:13.5px;font-weight:700">${esc(ORD.item.operator||'—')}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t("To'lov")}</span><span style="font-size:13.5px;font-weight:700">${ORD.paymentType==='cash'?t("To'liq to'lov"):ORD.months+' '+t('oyga')}</span></div>
          ${ORD.paymentType==='installment'?`<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t("Oylik to'lov")}</span><span class="sg" style="font-size:14px;font-weight:700;color:var(--blue-text)">${formatPrice(ORD.monthly)} ${SUM()}</span></div>`:''}
          ${ORD.paymentType==='installment'&&ORD.down?`<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t("Bosh to'lov")}</span><span class="sg" style="font-size:14px;font-weight:700">${formatPrice(ORD.down)}</span></div>`:''}
          ${ORD.discount?`<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Chegirma')}</span><span class="sg" style="font-size:14px;font-weight:700;color:var(--green)">−${formatPrice(ORD.discount)}</span></div>`:''}
          <div style="height:1px;background:var(--line-3)"></div>
          <div style="display:flex;align-items:baseline"><span style="flex:1;font-size:14.5px;font-weight:800">${ORD.paymentType==='installment'?t('Oyiga'):t('Jami')}</span><span class="sg" style="font-size:19px;font-weight:700">${ORD.paymentType==='installment'?formatPrice(ORD.monthly):formatPrice(finalPrice())} ${ORD.paymentType==='installment'?SUM():UNIT(ORD.item)}</span></div>
        </div>
      </div>
      <div class="card" style="margin-top:12px">
        <div style="display:flex;align-items:center"><span class="eyebrow" style="flex:1">${t('Mijoz')}</span><button data-ostep="2" style="font-size:12.5px;font-weight:700;color:var(--blue-text)">${t("O'zgartirish")}</button></div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:9px">
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Ism')}</span><span style="font-size:13.5px;font-weight:700">${esc(ORD.name)}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Telefon')}</span><span class="sg" style="font-size:13.5px;font-weight:700">+998 ${esc(formatUzNumber(ORD.phoneRaw))}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Viloyat')}</span><span style="font-size:13.5px;font-weight:700">${esc(ORD.region)}</span></div>
          ${ORD.location?`<div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Manzil')}</span><span class="sg" style="font-size:12.5px;font-weight:700">${ORD.location.lat.toFixed(5)}, ${ORD.location.lng.toFixed(5)}</span></div>`:''}
        </div>
      </div>
      <div style="margin-top:14px;display:flex;align-items:flex-start;gap:10px">
        <span style="width:22px;height:22px;border-radius:7px;background:var(--blue);display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4 4 10-10"></path></svg></span>
        <span style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.5">${LANG==='ru'?'Оформляя заказ, вы соглашаетесь с условиями публичной оферты. Менеджер свяжется в течение 15 минут.':"Buyurtma berish orqali <b>ommaviy oferta</b> shartlariga rozilik bildirasiz. Menejerimiz 15 daqiqa ichida bog'lanadi."}</span>
      </div>`;
    foot.innerHTML = `<button class="btn ghost" data-ostep="2" style="flex:none;width:100px">${t('Orqaga')}</button>
      <button class="btn" id="ordSubmit" style="flex:1">${t('Buyurtmani yuborish')}</button>`;
    return;
  }

  /* ---- 4: SMS ---- */
  if(ORD.step === 4){
    body.innerHTML = `
      <div style="text-align:center;padding:10px 0 4px">
        <span style="width:64px;height:64px;border-radius:22px;background:var(--blue-tint);color:var(--blue-text);display:inline-flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L5 20l1.3-4.1A7.5 7.5 0 1 1 20 12z"></path></svg></span>
        <h3 style="margin-top:14px;font-size:18px">${t('Tasdiqlash kodi')}</h3>
        <p style="margin:8px auto 0;font-size:12.5px;color:var(--muted);font-weight:600;line-height:1.55;max-width:280px">
          <b class="sg" style="color:var(--ink)">+998 ${esc(formatUzNumber(ORD.phoneRaw))}</b> ${LANG==='ru'?'— отправили 4-значный код.':'raqamiga 4 xonali kod yubordik.'}</p>
      </div>
      <div class="digits" style="margin-top:18px;max-width:240px;margin-left:auto;margin-right:auto" id="smsDigits">
        <input type="text" inputmode="numeric" maxlength="1" placeholder="1" data-s="0" aria-label="1"><input type="text" inputmode="numeric" maxlength="1" placeholder="2" data-s="1" aria-label="2">
        <input type="text" inputmode="numeric" maxlength="1" placeholder="3" data-s="2" aria-label="3"><input type="text" inputmode="numeric" maxlength="1" placeholder="4" data-s="3" aria-label="4">
      </div>
      <div id="smsMsg" style="margin-top:12px;text-align:center;font-size:12px;font-weight:700;color:var(--red);display:none"></div>
      <div style="margin-top:18px;text-align:center"><button id="smsResend" style="font-size:12.5px;font-weight:700;color:var(--blue-text)">${t('Kodni qayta yuborish')}</button></div>
      <div style="margin-top:10px;text-align:center"><button id="smsSkip" style="font-size:12px;font-weight:650;color:var(--muted)">${t('Kod kelmadi — baribir davom etish')}</button></div>`;
    foot.innerHTML = `<button class="btn" id="smsVerify" disabled>${t('Tasdiqlash')}</button>`;
    setTimeout(()=>{ bindSmsDigits(); const f = $('#smsDigits input'); if(f) f.focus(); }, 60);
    return;
  }

  /* ---- 5: tayyor ---- */
  if(ORD.step === 5){
    $('#ordStepsWrap').style.display = 'none';
    body.innerHTML = `
      <div style="text-align:center;padding:16px 0 4px">
        <span style="width:92px;height:92px;border-radius:50%;background:var(--green-tint);display:inline-flex;align-items:center;justify-content:center">
          <span style="width:64px;height:64px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" width="33" height="33" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4.5 4.5L19 8"></path></svg></span></span>
        <h3 style="margin-top:18px;font-size:21px">${t('Buyurtma qabul qilindi')}</h3>
        <p style="margin:9px auto 0;font-size:13px;color:var(--muted);font-weight:600;line-height:1.6;max-width:300px">${LANG==='ru'?'Менеджер свяжется с вами в течение 15 минут и расскажет об условиях оформления.':"Menejerimiz 15 daqiqa ichida siz bilan bog'lanadi va rasmiylashtirish shartlarini tushuntiradi."}</p>
      </div>
      <div class="card" style="margin-top:18px">
        <div style="display:flex;flex-direction:column;gap:11px">
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Raqam')}</span><span class="sg" style="font-size:15px;font-weight:700">${esc(shortNumber(ORD.item.number))}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${ORD.paymentType==='installment'?t("Oylik to'lov"):t('Summa')}</span><span class="sg" style="font-size:15px;font-weight:700">${ORD.paymentType==='installment'?formatPrice(ORD.monthly):formatPrice(finalPrice())} ${ORD.paymentType==='installment'?SUM():UNIT(ORD.item)}</span></div>
          <div style="display:flex"><span style="flex:1;font-size:13px;color:var(--text-3);font-weight:600">${t('Holati')}</span><span class="tag blue">${t('YANGI')}</span></div>
        </div>
      </div>`;
    foot.innerHTML = `<button class="btn ghost" data-close style="flex:none;width:110px">${t('Yopish')}</button>
      <a class="btn" href="#/buyurtmalarim" data-close style="flex:1">${t('Buyurtmalarim')}</a>`;
    return;
  }
}

function bindPhoneMask(){
  const inp = $('#inPhone'); if(!inp) return;
  /* IPHONE: yozayotganda maydon qiymatiga TEGILMAYDI.
     Har bir harfda `inp.value` qayta yozilsa, iOS kursorni ko'chiradi
     va klaviatura ustidagi bashorat paneli bilan sinxronlash
     kechikadi — mijoz buni "qotib qoldi, harf kech chiqyapti" deb
     his qiladi va ba'zan buyurtmani tashlab ketadi.
     Endi yozish erkin; bo'shliqlar maydondan CHIQQANDA qo'yiladi.
     `ORD.phoneRaw` esa avvalgiday har harfda yangilanadi (u faqat
     raqamlarni saqlaydi, ko'rinishga ta'sir qilmaydi). */
  inp.setAttribute('inputmode', 'tel');
  inp.addEventListener('input', (e)=>{
    ORD.phoneRaw = extractRawDigits(inp.value);
    $('#fPhone').classList.remove('bad');
    /* "+998" va bo'shliqlarni maydon O'ZI qo'yadi. iPhone qotmasligi
       uchun: qiymat faqat haqiqatan o'zgarganda, faqat kursor OXIRIDA
       bo'lganda qayta yoziladi; o'chirishda esa faqat oxirida qolgan
       ajratgich olinadi (Backspace tabiiy ishlaydi). */
    const ochirish = !!(e && e.inputType && e.inputType.indexOf('delete') === 0);
    const y = ORD.phoneRaw ? formatUzNumber(ORD.phoneRaw) : '';
    if(y === inp.value) return;
    if(ochirish){
      const t2 = inp.value.replace(/[\s-]+$/, '');
      if(t2 !== inp.value){ inp.value = t2; try{ inp.setSelectionRange(t2.length, t2.length); }catch(e2){} }
      return;
    }
    if(inp.selectionStart != null && inp.selectionStart < inp.value.length) return;
    inp.value = y;
    try{ inp.setSelectionRange(y.length, y.length); }catch(e2){}
  });
  inp.addEventListener('blur', ()=>{
    const raw = extractRawDigits(inp.value);
    const f = formatUzNumber(raw);
    if(f !== inp.value) inp.value = f;
    ORD.phoneRaw = raw;
  });
}
function bindRegion(){
  const sel = $('#inRegion'); if(!sel) return;
  const upd = ()=>{
    ORD.region = sel.value;
    $('#fRegion').classList.remove('bad');
    const w = $('#mapWrap');
    if(sel.value === 'Toshkent shahri' && SETTINGS.yandexApiKey){ w.style.display = ''; initMap(); }
    else { w.style.display = 'none'; ORD.location = null; }
  };
  sel.addEventListener('change', upd);
  if(sel.value) upd();
}
function validateStep2(){
  let ok = true;
  const name = ($('#inName').value||'').trim(), region = $('#inRegion').value, raw = extractRawDigits($('#inPhone').value);
  $('#fName').classList.toggle('bad', name.length < 2); if(name.length < 2) ok = false;
  let pOk = true;
  if(raw.length !== 9){ pOk = false; $('#phoneErr').textContent = t("To'g'ri raqam kiriting"); }
  else if(VALID_UZ_CODES.indexOf(raw.slice(0,2)) === -1){ pOk = false; $('#phoneErr').textContent = t('Bunday raqam mavjud emas'); }
  $('#fPhone').classList.toggle('bad', !pOk); if(!pOk) ok = false;
  $('#fRegion').classList.toggle('bad', !region); if(!region) ok = false;
  if(ok){
    ORD.name = name; ORD.phoneRaw = raw; ORD.region = region;
    try{ localStorage.setItem('vip_name',name); localStorage.setItem('vip_phone',raw); localStorage.setItem('vip_region',region); }catch(e){}
  }
  return ok;
}

/* ---------- Yandex xarita (faqat Toshkent shahri uchun) ---------- */
let ymapsLoaded = false, ymapObj = null;
function loadYmaps(){
  if(ymapsLoaded) return Promise.resolve();
  const key = SETTINGS.yandexApiKey;
  if(!key) return Promise.reject(new Error('no key'));
  return new Promise((res, rej)=>{
    const s = document.createElement('script');
    s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=${LANG==='ru'?'ru_RU':'uz_UZ'}`;
    s.onload = ()=> { ymapsLoaded = true; window.ymaps.ready(res); };
    s.onerror = ()=> rej(new Error('ymaps'));
    document.head.appendChild(s);
  });
}
async function initMap(){
  const box = $('#mapBox'); if(!box || box.dataset.ready) return;
  const lat = Number(SETTINGS.officeLat) || 41.311081, lng = Number(SETTINGS.officeLng) || 69.240562;
  try{
    await loadYmaps();
    box.dataset.ready = '1';
    ymapObj = new window.ymaps.Map(box, { center:[lat,lng], zoom:13, controls:['zoomControl','geolocationControl'] });
    const pin = document.createElement('div');
    pin.className = 'pin';
    pin.innerHTML = '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#2457E6" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" fill="#fff"></path><circle cx="12" cy="10" r="2.6" fill="#2457E6"></circle></svg>';
    box.appendChild(pin);
    const sync = ()=>{
      const c = ymapObj.getCenter();
      ORD.location = { lat:Number(c[0].toFixed(6)), lng:Number(c[1].toFixed(6)) };
      $('#mapAddr').textContent = `${ORD.location.lat.toFixed(5)}, ${ORD.location.lng.toFixed(5)}`;
    };
    ymapObj.events.add('boundschange', sync); sync();
  }catch(e){
    box.innerHTML = `<div style="padding:22px;text-align:center;font-size:12.5px;color:var(--muted);font-weight:600">${LANG==='ru'?'Карта недоступна. Менеджер уточнит адрес по телефону.':"Xarita ochilmadi. Manzilni menejer telefon orqali aniqlaydi."}</div>`;
  }
}

/* ---------- "Mening joylashuvim" ---------- */
function useMyLocation(){
  const btn = $('#geoBtn'); if(!btn) return;
  if(!navigator.geolocation){
    toast(LANG==='ru'?'Устройство не поддерживает геолокацию':"Qurilma joylashuvni aniqlay olmaydi",'bad'); return;
  }
  const old = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="spin" style="border-color:var(--line-2);border-top-color:var(--blue)"></span> ${t('Aniqlanmoqda…')}`;
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      ORD.location = { lat:Number(lat.toFixed(6)), lng:Number(lng.toFixed(6)) };
      const a = $('#mapAddr'); if(a) a.textContent = `${ORD.location.lat.toFixed(5)}, ${ORD.location.lng.toFixed(5)}`;
      if(ymapObj){ try{ ymapObj.setCenter([lat,lng], 17, { duration:420 }); }catch(e){} }
      toast(LANG==='ru'?'Местоположение определено':'Joylashuv aniqlandi');
      btn.disabled = false; btn.innerHTML = old;
    },
    (err)=>{
      btn.disabled = false; btn.innerHTML = old;
      const msg = (err && err.code === 1)
        ? (LANG==='ru'?'Доступ к геолокации запрещён. Отметьте адрес вручную.':"Joylashuvga ruxsat berilmadi. Manzilni qo'lda belgilang.")
        : (LANG==='ru'?'Не удалось определить место. Отметьте вручную.':"Joylashuvni aniqlab bo'lmadi. Qo'lda belgilang.");
      toast(msg, 'bad');
    },
    { enableHighAccuracy:true, timeout:12000, maximumAge:60000 }
  );
}

/* ---------- SMS ---------- */
function bindSmsDigits(){
  const boxes = $$('#smsDigits input');
  boxes.forEach((b,i)=>{
    b.addEventListener('input', ()=>{
      b.value = b.value.replace(/\D/g,'').slice(0,1);
      if(b.value && boxes[i+1]) boxes[i+1].focus();
      const code = boxes.map(x=>x.value).join('');
      $('#smsVerify').disabled = code.length !== 4;
      $('#smsMsg').style.display = 'none';
      if(code.length === 4) verifySms();
    });
    b.addEventListener('keydown', e => { if(e.key==='Backspace' && !b.value && boxes[i-1]) boxes[i-1].focus(); });
  });
}
async function sendSms(){
  try{
    const res = await withClientTimeout(fetch(FN + 'send-sms-code', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ phone: '+998' + ORD.phoneRaw })
    }), 7000);
    const data = await res.json();
    return data.ok ? { ok:true } : { ok:false, error:data.error };
  }catch(e){ return { ok:false, error:'timeout' }; }
}
async function verifySms(){
  const boxes = $$('#smsDigits input'), code = boxes.map(x=>x.value).join('');
  if(code.length !== 4) return;
  const btn = $('#smsVerify'); btn.disabled = true; btn.textContent = t('Tekshirilmoqda…');
  try{
    const res = await fetch(FN + 'verify-sms-code', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ phone:'+998' + ORD.phoneRaw, code })
    });
    const data = await res.json();
    if(data.ok){ await submitOrder(true); return; }
    $('#smsMsg').style.display='block'; $('#smsMsg').textContent = data.error || "Kod noto'g'ri";
    boxes.forEach(b => b.value=''); boxes[0].focus();
  }catch(err){ $('#smsMsg').style.display='block'; $('#smsMsg').textContent = xatoMatni(err); }
  finally{ const b = $('#smsVerify'); if(b){ b.disabled=false; b.textContent = t('Tasdiqlash'); } }
}


/* ================= BUYURTMA NAVBATI (V120) =================
   OXIRGI HIMOYA. Yuqoridagi ikki yo'l (server va to'g'ridan-to'g'ri
   Firestore) ham ishlamasa — ilgari buyurtma shu yerda BUTUNLAY
   yo'qolardi: mijoz xato ko'rib chiqib ketardi, bizda esa uning
   nomi ham, telefoni ham qolmasdi.
   Endi bunday buyurtma brauzer xotirasiga (localStorage) yoziladi va
   o'zi qayta yuborilib turadi: aloqa tiklanganda, sahifa qayta
   ochilganda va har 30 sekundda. `sorovId` borligi uchun ikkinchi
   nusxa YARATILMAYDI — server takrorni o'zi tanib oladi.
   Ya'ni: mijoz "Yuborish"ni bosgan bo'lsa, buyurtma YO'QOLMAYDI. */
const NAVBAT_KALIT = 'vip_buyurtma_navbat';
function navbatOqi(){ try{ return JSON.parse(localStorage.getItem(NAVBAT_KALIT) || '[]') || []; }catch(e){ return []; } }
function navbatYoz(a){ try{ localStorage.setItem(NAVBAT_KALIT, JSON.stringify(a.slice(-20))); }catch(e){} }
function navbatQosh(rec){
  const a = navbatOqi();
  if(a.some(x => x && x.sorovId === rec.sorovId)) return;
  rec.qoshildi = Date.now(); a.push(rec); navbatYoz(a);
}
let NAVBAT_ISHLAYDI = false, NAVBAT_TAYMER = null;
async function navbatYubor(){
  if(NAVBAT_ISHLAYDI) return;
  let a = navbatOqi();
  if(!a.length){ if(NAVBAT_TAYMER){ clearInterval(NAVBAT_TAYMER); NAVBAT_TAYMER = null; } return; }
  if(!navigator.onLine) return;
  NAVBAT_ISHLAYDI = true;
  try{
    for(const rec of a.slice()){
      /* 3 kundan oshgan yozuv — tashlab yuboriladi (abadiy qolmasin) */
      if(rec && rec.qoshildi && Date.now() - rec.qoshildi > 3*24*3600*1000){
        a = a.filter(x => x !== rec); navbatYoz(a); continue;
      }
      let tugadi = false, ok = false;
      try{
        const res = await fetch(FN + 'api-buyurtma', {
          method:'POST', headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ payload: rec.payload, numberId: rec.numberId || '', live: !!rec.live, sorovId: rec.sorovId })
        });
        let data = null; try{ data = await res.json(); }catch(e){}
        if(res.ok && data && data.ok){ tugadi = true; ok = true; rec.orderId = data.orderId; }
        /* 400 (ma'lumot noto'g'ri) va 409 (raqam band) — qayta yuborishdan
           foyda yo'q, navbatdan olib tashlanadi. */
        else if(res.status === 400 || res.status === 409) tugadi = true;
      }catch(e){}
      if(tugadi){
        a = a.filter(x => x !== rec); navbatYoz(a);
        if(ok){
          if(rec.xabar){
            try{
              fetch(FN + 'telegram-notify', {
                method:'POST', headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
                body: JSON.stringify({ text: rec.xabar, orderId: rec.orderId, mapUrl: rec.xaritaUrl })
              }).catch(()=>{});
            }catch(e){}
          }
          try{ toast(LANG==='ru' ? 'Ваш заказ отправлен \u2713' : "Buyurtmangiz yuborildi \u2713", 'good'); }catch(e){}
        }
      }
    }
  } finally { NAVBAT_ISHLAYDI = false; }
  if(navbatOqi().length && !NAVBAT_TAYMER){
    NAVBAT_TAYMER = setInterval(()=>{ navbatYubor(); }, 30000);
  }
}
function navbatIshgaTushir(){
  try{
    window.addEventListener('online', ()=> navbatYubor());
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) navbatYubor(); });
  }catch(e){}
  setTimeout(()=> navbatYubor(), 2500);
}

/* Telegram xabari matni — bir joyda (navbat ham shu matndan foydalanadi) */
function buyurtmaXabari(payload, orderTime){
  let paymentLine;
  if(payload.paymentType === 'installment'){
    paymentLine = `\u{1F4B3} To'lov turi: Bo'lib to'lash \u2014 ${payload.installmentMonths} oyga, oyiga ${formatPriceUzs(payload.monthlyPayment)}dan`;
    if(payload.installmentDownPayment !== undefined) paymentLine += "\n\u{1F4B0} Bosh to'lov: " + formatPriceUzs(payload.installmentDownPayment);
  }else{
    paymentLine = "\u{1F4B5} To'lov turi: Naqt to'lov";
    if(payload.currency === 'USD') paymentLine += "\n\u{1F4B2} Summa: " + formatPrice(payload.price) + " $";
  }
  const text = `\u{1F514} Yangi buyurtma\n\n\u{1F4F1} Buyurtma raqami: ${payload.number}\n\u{1F464} Mijoz ismi: ${payload.name}\n\u260E\uFE0F Ishlab turgan raqami: ${payload.phone}\n\u{1F4CD} Manzil: ${payload.region}\n${paymentLine}\n\u{1F550} Vaqti: ${orderTime}\n\u{1F310} Qayerdan: ${payload.source}`;
  const mapUrl = payload.location ? `https://yandex.uz/maps/?pt=${payload.location.lng},${payload.location.lat}&z=17&l=map` : undefined;
  return { text, mapUrl };
}

/* ---------- Buyurtmani yozish ---------- */
function buildPayload(){
  const it = ORD.item;
  const p = {
    number: displayNumber(it.number),
    price: finalPrice(),
    name: ORD.name,
    region: ORD.region,
    phone: '+998 ' + formatUzNumber(ORD.phoneRaw),
    phoneNormalized: ORD.phoneRaw.slice(-9),
    source: 'Sayt',
    paymentType: ORD.paymentType,
    operator: it.operator || '',
    catalogType: it.live ? 'Standart' : 'VIP'
  };
  /* Dollarlik raqam — adminka va Telegram xabari summani $ bilan ko'rsatishi uchun */
  if(isUsd(it)) p.currency = 'USD';
  /* RAQAM DILERNIKI bo'lsa — buyurtma uning kabinetiga ham tushsin.
     Serverda diler ro'yxatni ko'rganda har bir buyurtmaning raqami
     HAQIQATAN o'ziniki ekani qayta tekshiriladi (seller-api.js,
     `buyurtmalar`) — ya'ni bu maydonni o'zgartirib boshqa dilerning
     buyurtmasini ko'rib bo'lmaydi. */
  if(it.sellerId) p.sellerId = String(it.sellerId).slice(0, 60);
  if(ORD.paymentType === 'installment'){
    p.installmentMonths = ORD.months;
    p.monthlyPayment = ORD.monthly;
    if(installmentFinancingFor(it)){
      p.installmentDownPayment = ORD.down;
    }
  }
  if(ORD.location && typeof ORD.location.lat === 'number' && typeof ORD.location.lng === 'number'){
    p.location = { lat:Number(ORD.location.lat.toFixed(6)), lng:Number(ORD.location.lng.toFixed(6)) };
  }
  return p;
}

async function submitOrder(smsVerified){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  const it = ORD.item, payload = buildPayload();
  payload.smsVerified = !!smsVerified;
  const orderTime = sanaVaqtUz(new Date());
  let orderId = null, blocked = null;

  /* SO'ROV BELGISI (V120). Bitta buyurtma urinishi uchun BITTA belgi.
     Javob yo'lda yo'qolsa va qayta yuborilsa, server shu belgi bo'yicha
     eski buyurtmani topadi va IKKINCHISINI YARATMAYDI. */
  if(!ORD.sorovId){
    try{
      ORD.sorovId = (crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g,'').slice(0,32)
                                                  : (Date.now().toString(36) + Math.random().toString(36).slice(2,10));
    }catch(e){ ORD.sorovId = Date.now().toString(36) + Math.random().toString(36).slice(2,10); }
  }

  /* ASOSIY YO'L (V120) — BUYURTMA SERVER ORQALI YOZILADI.
     ------------------------------------------------------------------
     Ilgari brauzer o'zi Firestore'ga yozardi va bu uchta narsaga bir
     vaqtda bog'liq edi: qoidalar joylangani, App Check tokeni olingani,
     firestore.googleapis.com mijoz tarmog'idan ochilgani. Bittasi
     ishlamasa — buyurtma YO'QOLARDI (adminda "N ta mijoz yubormoqchi
     bo'ldi, uddalay olmadi" degan ogohlantirish aynan shundan edi).
     Endi so'rov saytning O'Z manziliga ketadi, server esa Admin SDK
     bilan yozadi — qoidalar ham, App Check ham yo'lni to'smaydi.
     Server javob bermasa — pastdagi ESKI yo'l zaxira sifatida qoladi,
     ya'ni ikkita mustaqil yo'ldan biri ishlasa buyurtma o'tadi. */
  payload.sorovId = ORD.sorovId;

  const serverYoz = async ()=>{
    const res = await withClientTimeout(fetch(FN + 'api-buyurtma', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        payload, numberId: (!it.live && it.id) ? it.id : '',
        live: !!it.live, sorovId: ORD.sorovId
      })
    }), kutishVaqti(12000));
    let data = null;
    try{ data = await res.json(); }catch(e){}
    if(res.status === 409 || (data && data.band)) throw new Error('ALREADY_RESERVED');
    if(res.ok && data && data.ok && data.orderId){
      if(data.bandQilinmadi){ try{ window.__BAND_XATO = 'server: band qilinmadi'; }catch(e){} }
      return data.orderId;
    }
    const e = new Error('SERVER_YOZMADI: ' + res.status + ' ' + ((data && data.error) || ''));
    e.serverdan = true;
    throw e;
  };

  const zaxiraYoz = async ()=>{
    if(!it.live && it.id){
      const numberRef = db.collection('numbers').doc(it.id), newRef = db.collection('orders').doc();
      try{
        await db.runTransaction(async (tx)=>{
          const snap = await tx.get(numberRef);
          if(snap.exists && snap.data().reserved === true) throw new Error('ALREADY_RESERVED');
          tx.set(newRef, { ...payload, numberId: it.id, status:'Yangi', createdAt: orderTime, createdAtSort: Date.now() });
          tx.update(numberRef, { reserved:true, reservedAt: FV.serverTimestamp() });
        });
        return newRef.id;
      }catch(err){
        if(err && err.message === 'ALREADY_RESERVED') throw err;
        /* ZAXIRA YO'L (V79). Tranzaksiya ikki ish qiladi: buyurtmani
           yozadi VA raqamni "band" qiladi. Agar aynan BAND QILISH qadami
           rad etilsa (masalan raqamda `reserved` maydoni umuman yo'q
           bo'lsa — eski raqamlarda shunday edi), ilgari BUTUN buyurtma
           yo'qolardi va mijoz "internetni tekshiring" degan xato ko'rardi.
           Endi bunday holatda buyurtmaning O'ZI baribir yoziladi — savdo
           yo'qolmaydi, admin raqamni panelda o'zi band qiladi. */
        const r = await db.collection('orders').add({
          ...payload, numberId: it.id, status:'Yangi',
          createdAt: orderTime, createdAtSort: Date.now()
        });
        try{ window.__BAND_XATO = String((err && (err.code || err.message)) || err); }catch(e){}
        return r.id;
      }
    }
    const liveKey = (payload.number||'').replace(/\D/g,''), newRef = db.collection('orders').doc();
    if(liveKey){
      const lockRef = db.collection('live_reservations').doc(liveKey);
      try{
        await db.runTransaction(async (tx)=>{
          const lock = await tx.get(lockRef);
          if(lock.exists) throw new Error('ALREADY_RESERVED');
          tx.set(newRef, { ...payload, numberId:null, status:'Yangi', createdAt: orderTime, createdAtSort: Date.now() });
          tx.set(lockRef, { reservedAt: FV.serverTimestamp() });
        });
        return newRef.id;
      }catch(err){
        if(err && err.message === 'ALREADY_RESERVED') throw err;
        const ref = await db.collection('orders').add({ ...payload, numberId:null, status:'Yangi', createdAt: orderTime, createdAtSort: Date.now() });
        return ref.id;
      }
    }
    const ref = await db.collection('orders').add({ ...payload, numberId:null, status:'Yangi', createdAt: orderTime, createdAtSort: Date.now() });
    return ref.id;
  };

  const writeOrder = async ()=>{
    try{
      try{
        return await serverYoz();
      }catch(e1){
        if(e1 && e1.message === 'ALREADY_RESERVED') throw e1;
        /* Server yo'li `sorovId` sababli TAKRORLANMAYDI — shuning uchun
           bir marta qayta urinish mutlaqo xavfsiz. Aynan shu "javob
           yo'lda yo'qoldi" holatini hal qiladi: agar birinchi so'rov
           allaqachon yozilgan bo'lsa, server o'sha buyurtmaning ID'sini
           qaytaradi, ikkinchisini YARATMAYDI. */
        await new Promise(r => setTimeout(r, 700));
        return await serverYoz();
      }
    }catch(err){
      if(err && err.message === 'ALREADY_RESERVED') throw err;
      /* Server yo'li ishlamadi — sababni yo'qotmaymiz, lekin mijozga
         ko'rsatmaymiz. Darhol zaxira yo'lga o'tamiz. */
      try{ console.warn('Server yo\'li ishlamadi, zaxira yo\'lga o\'tildi:', err && err.message); }catch(e){}
      try{ window.__SERVER_YOL_XATO = String((err && err.message) || err); }catch(e){}
      return await zaxiraYoz();
    }
  };

  const btn = $('#ordSubmit') || $('#smsVerify');
  if(btn){ btn.disabled = true; btn.textContent = t('Yuborilmoqda…'); }

  let xatoObj = null;
  try{ trackYuborishUrinishi(it); }catch(e){}
  try{ orderId = await withRetryClient(writeOrder, 2, 900); }
  catch(err){
    xatoObj = err;
    blocked = (err && err.message === 'ALREADY_RESERVED') ? 'ALREADY_RESERVED' : 'ERROR';
    /* Sababini yashirmaymiz: konsolda ham, o'zgaruvchida ham qoladi —
       shunda muammoni aniqlash uchun taxmin qilish shart emas. */
    try{ console.error('Buyurtma yozilmadi:', err && err.code, err && err.message, err); }catch(e){}
    try{ window.__SONGGI_XATO = { kod: (err && err.code) || '', matn: (err && err.message) || String(err), vaqt: new Date().toISOString() }; }catch(e){}
  }

  if(blocked){
    /* Yuborish ishlamadi — bu RAQAM YO'QOTILISHI. Alohida sanaladi,
       shunda admin "necha mijoz yubormoqchi bo'lib, uddalay olmadi"
       degan raqamni ko'radi (ilgari bu umuman bilinmasdi). */
    try{ trackYuborishXatosi(it); }catch(e){}
    if(btn){ btn.disabled=false; btn.textContent = ORD.step===4 ? t('Tasdiqlash') : t('Buyurtmani yuborish'); }
    if(blocked === 'ALREADY_RESERVED'){
      toast(xatoMatni(new Error('ALREADY_RESERVED')), 'bad');
      if(!it.live){ const n = NUMBERS.find(x => x.id === it.id); if(n){ n.reserved = true; renderAll(); } }
      closeSheet('shOrder');
    }else{
      /* XABAR MATNI (V79 -> V81).
         V79'da haqiqiy sabab mijozga ham ko'rsatilardi
         ("permission-denied", "App Check" kabi). Mijoz so'roviga ko'ra
         bunday TEXNIK so'zlar endi mijozga UMUMAN ko'rsatilmaydi —
         ekranda oddiy, tushunarli gap turadi.
         Texnik sabab yo'qolib ketmaydi: brauzer konsoliga yoziladi va
         `window.__SONGGI_XATO` da saqlanadi (admin/dasturchi ko'rishi
         uchun), ya'ni muammoni aniqlash imkoni saqlanib qoladi. */
      const kod = String((xatoObj && xatoObj.code) || '');
      const matn = String((xatoObj && xatoObj.message) || '');
      try{
        window.__SONGGI_XATO = kod + ' | ' + matn;
        console.error('Buyurtma yuborilmadi (texnik sabab):', kod, matn);
      }catch(e){}

      /* ENG MUHIMI (V120): BUYURTMANI YO'QOTMAYMIZ.
         Ikki yo'l ham ishlamadi — demak buyurtma navbatga yoziladi va
         o'zi qayta yuborilib turadi (aloqa tiklanganda, sahifa qayta
         ochilganda, har 30 sekundda). Mijoz hech narsa qilishi shart
         emas. `sorovId` sababli ikkinchi nusxa yaratilmaydi. */
      let navbatga = false;
      try{
        const xb = buyurtmaXabari(payload, orderTime);
        navbatQosh({
          payload, numberId: (!it.live && it.id) ? it.id : '', live: !!it.live,
          sorovId: ORD.sorovId, xabar: xb.text, xaritaUrl: xb.mapUrl
        });
        navbatga = true;
        navbatYubor();
      }catch(e){}

      let xabar;
      if(navbatga){
        xabar = LANG==='ru'
          ? 'Заказ сохранён и будет отправлен автоматически, как только появится связь.'
          : "Buyurtmangiz saqlandi \u2014 aloqa tiklanishi bilan o'zi yuboriladi.";
        toast(xabar, 'good');
        return;
      }
      if(kod === 'unavailable' || kod === 'deadline-exceeded'
         || /network|offline|Failed to fetch/i.test(matn)){
        xabar = LANG==='ru' ? 'Заказ не отправлен. Проверьте интернет.'
                            : 'Buyurtma yuborilmadi. Internetni tekshirib, qayta urining.';
      }else{
        /* Qolgan HAMMA holat (ruxsat, tekshiruv, kutilmagan xato) uchun
           bitta xotirjam xabar — mijozga kod/sabab ko'rsatilmaydi. */
        xabar = LANG==='ru'
          ? 'Заказ пока не удалось оформить. Попробуйте ещё раз немного позже или свяжитесь с нами.'
          : "Buyurtmani hozir qabul qilib bo'lmadi. Birozdan keyin qayta urinib ko'ring yoki biz bilan bog'laning.";
      }
      toast(xabar, 'bad');
    }
    return;
  }

  ORD.orderId = orderId;
  /* HAQIQIY buyurtma — faqat yozuv muvaffaqiyatli bo'lgandan keyin */
  try{ trackNumOrder(it); }catch(e){}
  if(!it.live){ const n = NUMBERS.find(x => x.id === it.id); if(n) n.reserved = true; }
  try{ localStorage.setItem('raqamuz_cache', JSON.stringify(NUMBERS)); }catch(e){}
  renderAll();

  /* Telegram — matn formati AYNAN eski kabi */
  try{
    const { text, mapUrl } = buyurtmaXabari(payload, orderTime);
    fetch(FN + 'telegram-notify', {
      method:'POST', headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ text, orderId, mapUrl })
    }).catch(()=>{});
  }catch(e){}

  ORD.step = 5; renderOrder();
  try{ if(navigator.vibrate) navigator.vibrate([12,50,12]); }catch(e){}
}


/* ===== 4-qism (avvalgi index.html, 7590-satr) ===== */

'use strict';

/* ==================================================================
   BUYURTMANI TEKSHIRISH (check-my-orders)
   ================================================================== */
const ORDER_STATUS = {
  'Yangi':          { tag:'blue',  label:'QABUL QILINDI' },
  "Bog'lanildi":    { tag:'vip',   label:'TASDIQLANDI' },
  "Yo'lda":         { tag:'vip',   label:"KURYER YO'LDA" },
  'Yakunlandi':     { tag:'green', label:'YETKAZILDI' },
  'Bekor qilindi':  { tag:'red',   label:'BEKOR QILINDI' }
};

/* ==================================================================
   BUYURTMA BOSQICHLARI (V122)
   ------------------------------------------------------------------
   Mijoz buyurtma bergach "endi nima bo'ladi?" degan savolga javob
   topa olmasdi — faqat quruq status so'zi turardi. Endi to'rt
   bosqichli zanjir ko'rinadi va mijoz qaysi bosqichda ekanini bir
   qarashda tushunadi.
   Bosqich nomlari ATAYLAB mijoz tilida: bazada "Bog'lanildi" deb
   turadi, mijoz esa "Tasdiqlandi" deb ko'radi.
   ================================================================== */
const BOSQICHLAR = [
  { kalit:'Yangi',        nom:'Qabul qilindi', izoh:'Buyurtmangiz tizimga tushdi' },
  { kalit:"Bog'lanildi",  nom:'Tasdiqlandi',   izoh:"Operator siz bilan bog'landi" },
  { kalit:"Yo'lda",       nom:"Kuryer yo'lda", izoh:'Raqamingiz yo\'lga chiqdi' },
  { kalit:'Yakunlandi',   nom:'Yetkazildi',    izoh:'Raqam sizga topshirildi' }
];
const BOSQICH_RU = {
  'Qabul qilindi':'Принят', 'Tasdiqlandi':'Подтверждён',
  "Kuryer yo'lda":'Курьер в пути', 'Yetkazildi':'Доставлен',
  'Buyurtmangiz tizimga tushdi':'Заказ поступил в систему',
  "Operator siz bilan bog'landi":'Оператор связался с вами',
  "Raqamingiz yo'lga chiqdi":'Номер в пути',
  'Raqam sizga topshirildi':'Номер передан вам'
};
const bq = (x) => (LANG === 'ru' ? (BOSQICH_RU[x] || x) : x);

function bosqichlarHtml(status){
  /* Bekor qilingan buyurtmada zanjir ko'rsatilmaydi — u zanjirdan
     tashqaridagi holat. */
  if(status === 'Bekor qilindi') return '';
  let joriy = BOSQICHLAR.findIndex(b => b.kalit === status);
  if(joriy < 0) joriy = 0;
  return '<div class="bsq">' + BOSQICHLAR.map((b, i) => {
    const holat = i < joriy ? 'ok' : (i === joriy ? 'on' : '');
    return '<div class="bsq-q ' + holat + '">'
      + '<span class="bsq-nuqta">' + (i < joriy
          ? '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
          : '') + '</span>'
      + '<div class="bsq-matn"><b>' + esc(bq(b.nom)) + '</b><i>' + esc(bq(b.izoh)) + '</i></div>'
      + '</div>';
  }).join('') + '</div>';
}

/* ==================================================================
   PROFIL KARTOCHKASI (V126)
   ------------------------------------------------------------------
   Serverdan kelgan `profile` obyektidan kabinetning yuqori qismini
   yasaydi. Hech qanday qo'shimcha so'rov qilinmaydi — hammasi
   allaqachon kelgan javobdan.
   ================================================================== */
/* V132: "Profil" bo'limi avvalgi holatiga qaytarildi — u yerda
   kabinet kartochkasi ham, kirish ham yo'q, faqat menyu (mijoz
   so'rovi). Shu sabab profil keshi va qo'shimcha so'rov olib
   tashlandi: bo'lim ochilganda endi HECH QANDAY tarmoq so'rovi
   ketmaydi. Kartochka faqat kabinetda ("Buyurtmalarim") ko'rinadi. */

function prfHarflar(ism, tel){
  const sozlar = String(ism||'').trim().split(/\s+/).filter(Boolean);
  if(sozlar.length >= 2) return (sozlar[0][0] + sozlar[1][0]).toUpperCase();
  if(sozlar.length === 1 && sozlar[0].length) return sozlar[0].slice(0,2).toUpperCase();
  /* Ism yo'q bo'lsa — telefonning oxirgi 2 raqami, bo'sh doira emas */
  return String(tel||'').replace(/\D/g,'').slice(-2) || '—';
}

function prfSana(ms, matn){
  if(!matn) return '';
  return matn;
}

function profilHtml(pr, tel, shartnomalar){
  if(!pr) pr = {};
  const ru = LANG === 'ru';
  const ism = String(pr.ism||'').trim();
  const nishonMatn = { vip: ru?'VIP':'VIP',
                       doimiy: ru?'Постоянный':'DOIMIY',
                       yangi: ru?'Клиент':'MIJOZ' }[pr.daraja] || (ru?'Клиент':'MIJOZ');
  const nishonSinf = ['vip','doimiy','yangi'].indexOf(pr.daraja) >= 0 ? pr.daraja : 'yangi';
  const nishonIc = nishonSinf === 'vip'
    ? '<svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" aria-hidden="true"><path d="m12 2.6 2.6 6.1 6.6.55-5 4.33 1.5 6.45L12 16.6l-5.7 3.43 1.5-6.45-5-4.33 6.6-.55z"/></svg>'
    : (nishonSinf === 'doimiy'
      ? '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>'
      : '');

  /* ---- KREDIT HOLATI: SPIDOMETR (V131) ----
     Mashinaning tezlik o'lchagichi kabi: 180 gradusli yarim aylana,
     chapda yashil, o'rtada sariq, o'ngda qizil, va strelka qayerda
     turganini ko'rsatadi. O'ngga siljigani sari yomon — to'lov ko'p
     qoldirilgan.

     Strelka burchagi KECHIKKAN OYLAR soniga qarab:
        0 oy  -> chap chekka (yashil)
        1 oy  -> o'rta (sariq)
        2 oy  -> qizilning boshi
        3+ oy -> o'ng chekka (qizil)
     Bosilsa to'lovlar jadvali ochiladi (u yerda rasmiy tushuntirish
     ham bor). */
  const spidHolat = ['yashil','sariq','qizil'].indexOf(pr.kreditHolat) >= 0 ? pr.kreditHolat : '';
  let spid = '';
  if(spidHolat){
    const kech = Math.max(0, Number(pr.kechikkanOy) || 0);
    /* 0 -> 0.08 (chap chekkaga yaqin, lekin tirkalmagan), 3+ -> 0.92 */
    const n = kech === 0 ? 0.08 : (kech === 1 ? 0.5 : (kech === 2 ? 0.72 : 0.92));
    const burchak = -90 + 180 * n;                 // -90° .. +90°
    const rad = burchak * Math.PI / 180;
    const Cx = 32, Cy = 28, R = 23;                // markaz va radius
    const ux = Cx + Math.sin(rad) * (R - 4.5);
    const uy = Cy - Math.cos(rad) * (R - 4.5);
    /* Yoy bo'laklari: har biri 60 gradus (3 x 60 = 180) */
    const yoy = (a1, a2) => {
      const p1 = [Cx + Math.sin(a1*Math.PI/180)*R, Cy - Math.cos(a1*Math.PI/180)*R];
      const p2 = [Cx + Math.sin(a2*Math.PI/180)*R, Cy - Math.cos(a2*Math.PI/180)*R];
      return `M ${p1[0].toFixed(2)} ${p1[1].toFixed(2)} A ${R} ${R} 0 0 1 ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    };
    const izohTooltip = ru
      ? 'Состояние платежей: зелёный — без просрочки, жёлтый — 1 мес., красный — 2 и более мес.'
      : "To'lov holati: yashil — kechikish yo'q, sariq — 1 oy, qizil — 2 va undan ko'p oy kechikkan";
    spid = `<span class="prf-spid ${spidHolat}" data-prfjadval role="button" tabindex="0" title="${izohTooltip}">
      <svg viewBox="0 0 64 34" width="64" height="34" aria-hidden="true">
        <path d="${yoy(-90,-30)}" fill="none" stroke="#4FBF8E" stroke-width="5.5" stroke-linecap="round" opacity="${spidHolat==='yashil'?1:.28}"/>
        <path d="${yoy(-28,28)}"  fill="none" stroke="#F5B942" stroke-width="5.5" stroke-linecap="round" opacity="${spidHolat==='sariq'?1:.28}"/>
        <path d="${yoy(30,90)}"   fill="none" stroke="#F2644E" stroke-width="5.5" stroke-linecap="round" opacity="${spidHolat==='qizil'?1:.28}"/>
        <line x1="${Cx}" y1="${Cy}" x2="${ux.toFixed(2)}" y2="${uy.toFixed(2)}"
              stroke="#fff" stroke-width="2.3" stroke-linecap="round"/>
        <circle cx="${Cx}" cy="${Cy}" r="3.1" fill="#fff"/>
      </svg>
      <span class="prf-spid-y">${ru?'платежи':"to'lov"}</span>
    </span>`;
  }

  /* ---- TO'LOV TASMASI (V128) ----
     Pastdagi "to'lovlar jadvali" endi shu kartochkaning ichida.
     Har bir oy — bitta ustun; to'langani yorqin, kechikkani qizil,
     kutilayotgani xira. Kartochka bosilsa to'liq jadval ochiladi.
     Shartnoma bo'lmasa tasma umuman chiqmaydi (bo'sh joy ko'rinmaydi,
     o'rniga ism qatori pastga suriladi). */
  const shList = Array.isArray(shartnomalar) ? shartnomalar : [];
  const barchaOylar = [];
  for(const c of shList){
    for(const o of (c.oylar || [])) barchaOylar.push(o);
  }
  barchaOylar.sort((a,b)=> (a.sanaMs||0) - (b.sanaMs||0));

  let tasma = '';
  if(barchaOylar.length){
    const tolangan = barchaOylar.filter(o => o.holat === 'tolandi').length;
    const jamiOy = barchaOylar.length;
    const qolgan = shList.reduce((a,c)=> a + (Number(c.qolganSumma)||0), 0);
    const valyuta = shList[0] && shList[0].currency === 'USD' ? ' $' : ' ' + SUM();
    /* Ustun soni ko'p bo'lsa (masalan 60 oy) har biri 1px'gacha
       ingichkalashadi — shunda ham o'qiladi, chunki rang bloklari
       yonma-yon turadi. */
    const ustunlar = barchaOylar.map(o =>
      `<s class="${o.holat === 'tolandi' ? 'ok' : (o.holat === 'kechikdi' ? 'kech' : '')}"></s>`).join('');
    tasma = `<div class="prf-jad" data-prfjadval role="button" tabindex="0"
        aria-label="${ru?'График платежей':"To'lovlar jadvali"}">
      <div class="prf-tasma" aria-hidden="true">${ustunlar}</div>
      <div class="prf-jad-t">
        <span><b>${tolangan}/${jamiOy}</b> ${ru?'мес. оплачено':"oy to'landi"}</span>
        <em>${qolgan > 0
            ? `${ru?'остаток':'qoldi'} <b>${formatPrice(qolgan)}${esc(valyuta)}</b>`
            : `<b>${ru?'погашен':"to'liq to'landi"}</b>`}
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
        </em>
      </div>
    </div>`;
  }

  /* Daraja ostidagi mayda qator. Ustuvorlik: kechikish > keyingi
     to'lov > nechta raqam olingani. Kartochkada joy oz, shuning uchun
     FAQAT BITTASI ko'rinadi — eng muhimi. */
  let izoh = '', izohOgoh = false;
  if(pr.kechikkanOy){
    izoh = pr.kechikkanOy + ' ' + (ru?'мес. просрочка':'oy kechikdi');
    izohOgoh = true;
  }else if(pr.keyingiSana){
    izoh = (ru?'платёж ':"to'lov ") + pr.keyingiSana;
  }else if(pr.yakunlangan){
    izoh = pr.yakunlangan + ' ' + (ru?'номер':'ta raqam');
  }else if(pr.jamiBuyurtma){
    izoh = pr.jamiBuyurtma + ' ' + (ru?'заказ':'ta buyurtma');
  }

  /* Pastki chap burchak: ism, uning ostida mijozlik sanasi (bank
     kartochkasidagi "valid thru" o'rnida). Ism bo'lmasa — telefon
     tepaga chiqadi, pastda esa shunchaki "mijoz". */
  const pastIzoh = pr.mijozlikSana
    ? (ru?'клиент с ':'mijoz ') + pr.mijozlikSana
    : (ru?'клиент':'mijoz');

  return `<div class="prf ${nishonSinf}">
    <div class="prf-top">
      <div class="prf-brend">
        <b>VIP RAQAMLAR</b>
      </div>
      ${spid}
      <button type="button" class="prf-chiq" data-kabchiq aria-label="${ru?'Выйти':'Chiqish'}" title="${ru?'Выйти':'Chiqish'}">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 17l5-5-5-5"></path><path d="M20 12H9"></path><path d="M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"></path></svg>
      </button>
    </div>

    <div class="prf-raqam">+998 ${esc(formatUzNumber(tel))}</div>
    ${tasma}
    ${spidHolat ? `<div class="prf-izohlash">${ru
        ? 'Шкала платежей: зелёный — без просрочки, красный — есть просроченные месяцы.'
        : "To'lov shkalasi: yashil — kechikish yo'q, qizil — to'lov ko'p qoldirilgan."}</div>` : ''}

    <div class="prf-past">
      <div class="prf-ism">
        <b>${ism ? esc(ism) : (ru?'Клиент':'Mijoz')}</b>
        <i>${esc(pastIzoh)}</i>
      </div>
      <div class="prf-ong">
        <span class="prf-nishon ${nishonSinf}">${nishonIc}${nishonMatn}</span>
        ${izoh ? `<span class="prf-izoh${izohOgoh?' ogoh':''}">${esc(izoh)}</span>` : ''}
      </div>
    </div>
  </div>`;
}

async function lookupOrders(kirishToken){
  const box = $('#oqResult');
  /* V131: kabinet FAQAT token bilan ochiladi (Telegram kodi orqali
     olingan). Telefon va "raqamning oxirgi 4 ta raqami" endi
     so'ralmaydi — bitta, ishonchli yo'l. */
  const tok = kirishToken || kabTokenOl();
  if(!tok){ return; }
  const phone = (kabEslaganni() || {}).tel || extractRawDigits(($('#oqPhone')||{}).value || '');
  const btn = $('#oqKirBtn'); btn.disabled = true; btn.textContent = t('Tekshirilmoqda…');
  /* V126: avval profil skeleti, keyin buyurtma skeletlari — kelgan
     ma'lumot shu joylarning o'rniga tushadi, sahifa sakramaydi. */
  box.innerHTML = skPrf() + skeletons(2);
  try{
    /* V122: MIJOZ KABINETI. Ilgari bu yerda faqat buyurtmalar
       olinardi (`check-my-orders`), shartnoma esa BOSHQA bo'limda,
       shartnoma ID'si bilan qidirilardi — mijoz uni eslab qolmasdi.
       Endi bitta so'rov: buyurtmalar HAM, shartnomalar HAM keladi. */
    const res = await withClientTimeout(fetch(FN + 'api-kabinet', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ token: tok })
    }), kutishVaqti(14000));
    const data = await res.json();
    const buyurtmalar = (data && data.orders) || [];
    const shartnomalar = (data && data.contracts) || [];

    if(!data.ok || (!buyurtmalar.length && !shartnomalar.length)){
      /* Eslab qolingan ma'lumot endi ishlamayapti (masalan mijoz
         boshqa raqam kiritgan) — uni tozalaymiz va formani qaytaramiz,
         aks holda bo'lim har ochilganda shu xato chiqaverardi. */
      try{ localStorage.removeItem(KAB_KALIT); }catch(e){}
      const f2 = $('#oqForma'); if(f2) f2.style.display = '';
      const t2 = $('#oqTushuntirish'); if(t2) t2.style.display = '';
      if(data && data.qaytaKirish){
        box.innerHTML = emptyBox(IC_WARN, t('Qaytadan kiring'),
          LANG==='ru' ? 'Срок входа истёк. Запросите новый код.' : "Kirish muddati tugadi. Yangi kod so'rang.", null);
        return;
      }
      box.innerHTML = emptyBox(IC_BOX, t('Buyurtma topilmadi'), data.error || (LANG==='ru'?'По этим номерам заказов нет. Проверьте телефон и последние 4 цифры.':"Bu raqamlar bo'yicha buyurtma yo'q. Telefon va oxirgi 4 ta raqamni tekshiring."), null);
      return;
    }

    KAB_TEL = phone;
    KAB_SHARTNOMALAR = shartnomalar;
    /* V124: bir marta kirgandan keyin eslab qolamiz — keyingi safar
       kabinet o'zi ochiladi. */
    kabEslab(phone.slice(-9), tok);
    const forma = $('#oqForma'); if(forma) forma.style.display = 'none';
    /* Kirgan mijozga "telefon raqamingizni kiriting" degan tushuntirish
       kerak emas — u faqat chalkashtiradi. */
    const tush = $('#oqTushuntirish'); if(tush) tush.style.display = 'none';

    /* V126: kabinet endi PROFILDAN boshlanadi — kim kirgan, qancha
       vaqtdan beri mijoz, nechta buyurtma va qachon to'lov. */
    let html = profilHtml(data.profile, phone, shartnomalar);

    /* ---------- BUYURTMALAR (bosqichlar bilan) ---------- */
    if(buyurtmalar.length){
      const COL = { 'Yangi':'var(--blue)', "Bog'lanildi":'var(--gold)', "Yo'lda":'#7C5CFF', 'Yakunlandi':'var(--green)', 'Bekor qilindi':'var(--red)' };
      html += `<div class="eyebrow" style="padding:0 4px;margin-bottom:10px">${buyurtmalar.length} ${t('ta buyurtma')}</div>`;
      html += buyurtmalar.map(o => {
        const st = ORDER_STATUS[o.status] || { tag:'grey', label: String(o.status||'—').toUpperCase() };
        const bar = COL[o.status] || 'var(--line-2)';
        return `<div class="rescard">
          <span class="rb" style="background:${bar}"></span>
          <div class="rh">
            <span class="id sg">${esc(o.createdAt||'')}</span>
            <span class="tag ${st.tag}" style="margin-left:auto">${esc(st.label)}</span>
          </div>
          <div style="display:flex;align-items:flex-end;gap:12px">
            <div style="flex:1;min-width:0">
              <div class="big sg">${esc(shortNumber(o.number))}</div>
              <div class="sub">${o.paymentType === 'installment'
                  ? `${t("Bo'lib to'lash")}${o.installmentMonths?' · '+esc(o.installmentMonths)+' '+t('oy'):''}${o.monthlyPayment?' · '+formatPrice(o.monthlyPayment)+' '+SUM()+'/'+t('oy'):''}`
                  : t("To'liq to'lov")}</div>
            </div>
            <div class="amt sg">${formatPrice(o.price)}${o.currency==='USD'?' $':''}</div>
          </div>
          ${bosqichlarHtml(o.status)}
        </div>`;
      }).join('');
    }

    /* ---------- SHARTNOMALAR (to'lov jadvali bilan) ---------- */
    if(shartnomalar.length){
      html += `<div class="eyebrow" style="padding:0 4px;margin:18px 0 10px">${shartnomalar.length} ${LANG==='ru'?'договор':'ta shartnoma'}</div>`;
      html += shartnomalar.map(c => kabShartnomaHtml(c)).join('');
    }

    box.innerHTML = html;
  }catch(err){
    box.innerHTML = emptyBox(IC_WARN, t("Tekshirib bo'lmadi"), xatoMatni(err), t('Qayta urinish'), 'id="oqRetry"', true);
  }finally{
    if(btn){ btn.disabled = false; btn.textContent = t('Kabinetga kirish'); }
  }
}

/* ==================================================================
   KABINETGA KIRISH — BITTA YO'L: TELEGRAM BOTI (V131)
   ------------------------------------------------------------------
   1. Mijoz telefon raqamini yozadi va «Kodni olish» ni bosadi.
   2. Sayt serverdan botga MAXSUS HAVOLA oladi va uni ochadi.
      Telegram havolani ochishi bilan «Start» ni O'ZI bosadi —
      mijoz hech narsa yozmaydi.
   3. Bot raqam egasini tekshiradi va 4 xonali kodni bosib
      nusxalanadigan ko'rinishda yuboradi.
   4. Mijoz kodni shu yerga joylashtiradi — kabinet ochiladi va
      1 yilga eslab qolinadi.

   Telegram xabarida «⚡️ Bir bosishda kirish» tugmasi ham bor: u
   saytni ochib, kodni ham kiritmasdan kiritadi (boshqa brauzerdan
   kirish uchun eng qulay yo'l).

   SMS YO'Q, "raqamning oxirgi 4 ta raqami" degan zaxira yo'l ham
   YO'Q — ataylab olib tashlandi (xavfsizlik uchun).
   ================================================================== */

/* Botga havola olish va uni ochish. */
async function kodYubor(){
  const phone = extractRawDigits($('#oqPhone').value);
  if(phone.length < 9){
    toast(LANG==='ru'?'Введите полный номер телефона':"To'liq telefon raqamini kiriting",'bad');
    const el = $('#oqPhone'); if(el) el.focus();
    return;
  }
  const btn = $('#oqKodBtn');
  const asl = btn.innerHTML;
  btn.disabled = true; btn.textContent = t('Ochilmoqda…');

  /* MUHIM: yangi oynani so'rovdan OLDIN ochamiz. Brauzerlar
     "popup"ni faqat odam bosgan paytda ochishga ruxsat beradi;
     so'rov javobini kutib tursak, oyna BLOKLANADI. Shuning uchun
     bo'sh oyna darhol ochiladi va manzili keyin qo'yiladi. */
  let oyna = null;
  try{ oyna = window.open('', '_blank'); }catch(e){}

  try{
    const res = await withClientTimeout(fetch(FN + 'api-kabinet-kod', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ action:'boshla', phone })
    }), kutishVaqti(14000));
    const data = await res.json();

    if(data && data.ok && data.havola){
      /* Telefon raqamini shu yerda eslab qo'yamiz — kodni
         tekshirishda kerak bo'ladi (mijoz maydonni tozalab yuborsa
         ham ishlasin). */
      KOD_TEL = phone.slice(-9);
      if(oyna){ oyna.location.href = data.havola; }
      else { location.href = data.havola; }   /* popup bloklangan bo'lsa */
      const h = $('#oqKodHint');
      if(h) h.textContent = LANG==='ru'
        ? 'Бот открыт. Скопируйте код и вставьте сюда.'
        : "Bot ochildi. Kodni nusxalab shu yerga joylashtiring.";
      const b0 = $$('#oqKod input')[0]; if(b0) b0.focus();
      return;
    }
    if(oyna) { try{ oyna.close(); }catch(e){} }
    toast((data && data.error) || t("Hozir ochib bo'lmadi"), 'bad');
  }catch(err){
    if(oyna) { try{ oyna.close(); }catch(e){} }
    toast(xatoMatni(err), 'bad');
  }finally{
    btn.disabled = false; btn.innerHTML = asl;
  }
}

/* «Kodni olish» bosilgan telefon — kodni tekshirishda ishlatiladi. */
let KOD_TEL = '';

let KOD_TEKSHIRILMOQDA = false;
async function kodTekshir(){
  /* Oxirgi katak to'lganda ham, Enter bosilganda ham, yopishtirilganda
     ham shu funksiya chaqiriladi — ikki marta yuborilib ketmasin
     (aks holda bitta kod uchun ikkita urinish sarflanardi). */
  if(KOD_TEKSHIRILMOQDA) return;
  const phone = KOD_TEL || extractRawDigits($('#oqPhone').value).slice(-9);
  const kod = ($('#oqKodVal').value || '').replace(/\D/g,'');
  if(phone.length !== 9){
    toast(LANG==='ru'?'Введите полный номер телефона':"To'liq telefon raqamini kiriting",'bad');
    return;
  }
  if(kod.length !== 4){
    toast(LANG==='ru'?'Введите 4-значный код':'4 xonali kodni kiriting','bad');
    return;
  }
  KOD_TEKSHIRILMOQDA = true;
  const btn = $('#oqKirBtn');
  const asl = btn.innerHTML;
  btn.disabled = true; btn.textContent = t('Tekshirilmoqda…');
  try{
    const res = await withClientTimeout(fetch(FN + 'api-kabinet-kod', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ action:'tekshir', phone, code: kod })
    }), kutishVaqti(14000));
    const data = await res.json();
    if(data && data.ok && data.token){
      kabEslab(phone, data.token);
      $$('#oqKod input').forEach(b => b.value = '');
      $('#oqKodVal').value = '';
      haptic('medium');
      await lookupOrders(data.token);
      return;
    }
    toast((data && data.error) || t("Kod noto'g'ri"), 'bad');
    $$('#oqKod input').forEach(b => b.value = '');
    $('#oqKodVal').value = '';
    const b0 = $$('#oqKod input')[0]; if(b0) b0.focus();
  }catch(err){
    toast(xatoMatni(err), 'bad');
  }finally{
    btn.disabled = false; btn.innerHTML = asl;
    KOD_TEKSHIRILMOQDA = false;
  }
}

/* ------------------------------------------------------------------
   «BIR BOSISHDA KIRISH» — Telegram xabaridagi tugma
   Bot yuborgan havola: /#/kirish?k=<bir martalik kalit>
   Kalit tokenga almashtiriladi va kabinet darhol ochiladi. Bu BOSHQA
   BRAUZERDAN (Safari, Chrome) kirishning eng qisqa yo'li — kod ham
   kiritilmaydi.
   Kalit BIR MARTALIK va 10 daqiqa yashaydi: havola chat tarixida
   qolsa ham ikkinchi marta ishlamaydi.
   ------------------------------------------------------------------ */
async function kirishKaliti(){
  const h = String(location.hash || '');
  const m = h.match(/[?&]k=([\w-]{16,64})/);
  if(!m) return false;
  const kalit = m[1];
  /* Manzilni darhol tozalaymiz — kalit brauzer tarixida qolmasin. */
  try{ history.replaceState(null, '', location.pathname + location.search + '#/buyurtmalarim'); }catch(e){}
  try{
    const res = await withClientTimeout(fetch(FN + 'api-kabinet-kod', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ action:'kalit', key: kalit })
    }), kutishVaqti(14000));
    const data = await res.json();
    if(data && data.ok && data.token){
      kabEslab(String(data.phone || data.token.split('.')[0]), data.token);
      KAB_YUKLANDI = false;
      toast(LANG==='ru' ? 'Вы вошли' : 'Kabinetga kirdingiz', 'ok');
      return true;
    }
    toast((data && data.error) || t('Havola yaroqsiz'), 'bad');
  }catch(err){ toast(xatoMatni(err), 'bad'); }
  return false;
}

(function(){
  const kb = $('#oqKodBtn');  if(kb) kb.addEventListener('click', kodYubor);
  const kr = $('#oqKirBtn');  if(kr) kr.addEventListener('click', ()=> kodTekshir());

  /* 4 ta katak: avtomatik keyingisiga o'tish, Backspace bilan orqaga,
     va butun kodni bir marta joylashtirish (Telegram'dan nusxa olib
     qo'yganda hamma katakka tarqaladi). */
  const boxes = $$('#oqKod input'), hidden = $('#oqKodVal');
  if(boxes.length && hidden){
    const sync = ()=> hidden.value = boxes.map(b=>b.value).join('');
    boxes.forEach((b,i)=>{
      b.addEventListener('input', ()=>{
        b.value = b.value.replace(/\D/g,'').slice(0,1);
        if(b.value && boxes[i+1]) boxes[i+1].focus();
        sync();
        if(hidden.value.length === 4) kodTekshir();
      });
      b.addEventListener('keydown', (e)=>{
        if(e.key === 'Backspace' && !b.value && boxes[i-1]) boxes[i-1].focus();
        if(e.key === 'Enter') kodTekshir();
      });
      b.addEventListener('focus', ()=> b.select());
      b.addEventListener('paste', (e)=>{
        const matn = ((e.clipboardData || window.clipboardData).getData('text') || '').replace(/\D/g,'');
        if(!matn) return;
        e.preventDefault();
        boxes.forEach((x,j)=> x.value = matn[j] || '');
        sync();
        const oxirgi = boxes[Math.min(matn.length, boxes.length) - 1];
        if(oxirgi) oxirgi.focus();
        if(hidden.value.length === 4) kodTekshir();
      });
    });
  }
})();

/* Kabinet so'rovi uchun ishlatilgan telefon — PDF yuklab olishda
   qaytadan so'ramaslik uchun eslab qolinadi. */
let KAB_TEL = '';

/* ==================================================================
   KABINETNI ESLAB QOLISH (V124)
   ------------------------------------------------------------------
   MUAMMO. Oldingi versiyada kabinet to'g'ri ishlardi, lekin mijoz
   bo'limga HAR KIRGANDA telefon raqamini va oxirgi 4 ta raqamni
   QAYTA yozishi kerak edi. "Kabinet" deb atalgan narsa uchun bu
   noto'g'ri — kabinet o'zi ochilishi kerak.

   YECHIM. Bir marta muvaffaqiyatli kirgandan keyin telefon va 4 ta
   raqam SHU TELEFONNING O'ZIDA saqlanadi (localStorage) va keyingi
   safar bo'lim o'zi, hech narsa so'ramasdan ochiladi.

   XAVFSIZLIK. Saqlanadigan narsa — mijozning O'ZI kiritgan, o'zining
   telefon raqami va o'zi sotib olgan raqamning 4 ta raqami. Hech
   qanday parol, token yoki shaxsiy hujjat ma'lumoti saqlanmaydi.
   Ma'lumotning O'ZI (buyurtma, shartnoma) saqlanmaydi — u har safar
   serverdan, o'sha ikki bosqichli tekshiruvdan o'tib keladi.
   Boshqa odamning telefoniga o'tib qolmasligi uchun "Chiqish" tugmasi
   ko'rinib turadi. */
const KAB_KALIT = 'vip_kabinet';
const KAB_COOKIE = 'vipkab';

/* ------------------------------------------------------------------
   KIRISHNI SAQLASH — IKKI YO'L BILAN (V131)
   Mijoz so'rovi: saytdan chiqib ketib qaytsa ham, kabinet saqlanib
   qolsin. Shuning uchun token IKKI joyga yoziladi:
     1) localStorage — asosiy joy;
     2) cookie (1 yil) — zaxira. Ba'zi brauzerlar (xususan iOS Safari
        "Private" yoki saytlar ma'lumotini tozalash sozlamasi)
        localStorage'ni o'chirib yuboradi, cookie esa qoladi — yoki
        aksincha. Biri yo'qolsa, ikkinchisidan tiklanadi.
   BOSHQA BRAUZER (Chrome -> Safari) — bu boshqa qurilma kabi:
   brauzerlar bir-birining ma'lumotini KO'RA OLMAYDI (bu ularning
   xavfsizlik qoidasi, aylanib o'tib bo'lmaydi). Shuning uchun u
   yerda bir marta kod olinadi — yoki Telegram'dagi «Bir bosishda
   kirish» tugmasi bosiladi, u o'sha brauzerda darhol kiritadi.
   MA'LUMOTNING O'ZI (buyurtma, shartnoma, to'lovlar) serverda —
   qaysi brauzerdan kirmasin, hammasi joyida turadi.
   ------------------------------------------------------------------ */
function kukiYoz(nom, qiymat, kun){
  try{
    const muddat = new Date(Date.now() + (kun||365)*864e5).toUTCString();
    document.cookie = nom + '=' + encodeURIComponent(qiymat)
      + '; expires=' + muddat + '; path=/; SameSite=Lax'
      + (location.protocol === 'https:' ? '; Secure' : '');
  }catch(e){}
}
function kukiOl(nom){
  try{
    const m = document.cookie.match(new RegExp('(?:^|; )' + nom + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }catch(e){ return ''; }
}
function kukiOchir(nom){
  try{ document.cookie = nom + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'; }catch(e){}
}

const TOKEN_SHAKLI = /^\d{9}\.\d{10,16}\.[\w-]{8,64}$/;

/* Tokenni qayerdan topsa — o'shandan oladi, va ikkinchi joyga
   qaytarib yozib qo'yadi (biri yo'qolgan bo'lsa tiklanadi). */
function kabTokenOl(){
  let t = '', tel = '';
  try{
    const o = JSON.parse(localStorage.getItem(KAB_KALIT) || 'null');
    if(o && TOKEN_SHAKLI.test(String(o.token||''))){ t = o.token; tel = String(o.tel||''); }
  }catch(e){}
  if(!t){
    const c = kukiOl(KAB_COOKIE);
    if(TOKEN_SHAKLI.test(c)){ t = c; tel = c.split('.')[0]; }
  }
  if(t){
    /* Ikkala joyda ham turishini ta'minlaymiz */
    try{ localStorage.setItem(KAB_KALIT, JSON.stringify({ tel: tel || t.split('.')[0], token: t, at: Date.now() })); }catch(e){}
    if(kukiOl(KAB_COOKIE) !== t) kukiYoz(KAB_COOKIE, t, 365);
  }
  return t;
}

function kabEslaganni(){
  const t = kabTokenOl();
  if(!t) return null;
  return { tel: t.split('.')[0], token: t };
}
function kabEslab(tel, token){
  if(!TOKEN_SHAKLI.test(String(token||''))) return;
  try{ localStorage.setItem(KAB_KALIT, JSON.stringify({ tel, token, at: Date.now() })); }catch(e){}
  kukiYoz(KAB_COOKIE, token, 365);
}
function kabUnut(){
  kukiOchir(KAB_COOKIE);
  try{ localStorage.removeItem(KAB_KALIT); }catch(e){}
  /* V132: eski versiyalardan qolgan profil keshi ham tozalansin
     (u endi ishlatilmaydi, lekin mijozning telefonida yotib
     qolgan bo'lishi mumkin). */
  try{ localStorage.removeItem('vip_profil'); }catch(e){}
  KAB_SHARTNOMALAR = [];
  KAB_TEL = '';
  const box = $('#oqResult'); if(box) box.innerHTML = '';
  const tel = $('#oqPhone'); if(tel) tel.value = '';
  $$('#oqKod input').forEach(b => { b.value = ''; });
  const kv = $('#oqKodVal'); if(kv) kv.value = '';
  const forma = $('#oqForma'); if(forma) forma.style.display = '';
  const tush = $('#oqTushuntirish'); if(tush) tush.style.display = '';
  toast(LANG==='ru' ? 'Вы вышли из кабинета' : 'Kabinetdan chiqdingiz');
}

/* Bo'lim ochilganda: eslab qolingan bo'lsa — o'zi yuklanadi. */
let KAB_YUKLANDI = false;
/* ==================================================================
   MINI ILOVADA KODSIZ KIRISH (V136)
   ------------------------------------------------------------------
   Telegram mini ilovaga kirgan odamni bot ALLAQACHON taniydi:
   Telegram sahifaga `initData` beradi va uni BOT KALITI bilan
   imzolaydi. Serverda imzo tekshiriladi va chat ID bo'yicha telefon
   topiladi (qarang: netlify/functions/api-kabinet-tg.js).

   Ya'ni mini ilovada kabinet KOD SO'RAMASDAN, o'zi ochiladi.
   Imzo tekshirilmasa yoki raqam hali bog'lanmagan bo'lsa — mijoz
   odatdagi (kod bilan) yo'ldan kiradi, hech narsa buzilmaydi.
   ================================================================== */
let TG_KIRISH_URINDI = false;
async function tgKabinetgaKir(){
  if(TG_KIRISH_URINDI) return false;
  TG_KIRISH_URINDI = true;
  try{
    const wa = TG.obyekt;
    const initData = wa && wa.initData;
    if(!initData) return false;
    const res = await withClientTimeout(fetch(FN + 'api-kabinet-tg', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ initData })
    }), kutishVaqti(12000));
    const data = await res.json();
    if(data && data.ok && data.token){
      kabEslab(String(data.phone || data.token.split('.')[0]), data.token);
      return true;
    }
    /* Raqam hali botda tasdiqlanmagan — mijozga bitta tugmali,
       tushunarli yo'l ko'rsatamiz. */
    if(data && data.bogla){
      const box = $('#oqResult');
      const nom = String(data.botNomi || 'vip_raqamlar_bot').replace(/[^\w_]/g,'');
      if(box) box.innerHTML = `<div class="card" style="background:var(--navy-grad);border-color:transparent;color:#fff">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <span style="width:40px;height:40px;border-radius:13px;background:rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;flex:none">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#fff" aria-hidden="true"><path d="M21.6 4.3 2.9 11.5c-.9.35-.88 1.63.03 1.95l4.6 1.6 1.78 5.3c.23.68 1.1.86 1.58.33l2.5-2.75 4.7 3.45c.6.44 1.45.11 1.6-.62l3.2-15c.17-.78-.6-1.44-1.3-1.16zM9.5 14.3l-.3 3.2-1.2-3.6 8.9-5.6-7.4 6z"></path></svg>
          </span>
          <div style="flex:1;min-width:0">
            <b style="display:block;font-size:14.5px;font-weight:800">${LANG==='ru'?'Подтвердите номер':'Raqamingizni tasdiqlang'}</b>
            <div style="margin-top:6px;font-size:12px;color:#A9BCD6;font-weight:600;line-height:1.55">${esc(data.error||'')}</div>
          </div>
        </div>
        <a class="btn" href="https://t.me/${nom}?start=kabinet" style="margin-top:14px">
          <span>${LANG==='ru'?'Подтвердить в боте':'Botda tasdiqlash'}</span>
        </a>
      </div>`;
      const f2 = $('#oqForma'); if(f2) f2.style.display = 'none';
      const t2 = $('#oqTushuntirish'); if(t2) t2.style.display = 'none';
      return 'bogla';
    }
  }catch(e){ /* jim — mijoz kod bilan kiradi */ }
  return false;
}

async function kabAvtoOch(){
  let o = kabEslaganni();
  /* V136: Telegram ichida bo'lsak va hali kirmagan bo'lsak — avval
     kodsiz kirishni sinab ko'ramiz. */
  if(!o && tgIchida() && TG.bor()){
    const f0 = $('#oqForma'); if(f0) f0.style.display = 'none';
    const t00 = $('#oqTushuntirish'); if(t00) t00.style.display = 'none';
    const box0 = $('#oqResult'); if(box0) box0.innerHTML = skPrf();
    const natija = await tgKabinetgaKir();
    if(natija === 'bogla') return;          /* xabar ko'rsatildi */
    o = kabEslaganni();
    if(!o && box0) box0.innerHTML = '';
  }
  if(!o){
    const f = $('#oqForma'); if(f) f.style.display = '';
    const t0 = $('#oqTushuntirish'); if(t0) t0.style.display = '';
    return;
  }
  /* Forma yashiriladi — mijoz uni ko'rib "yana yozishim kerakmi?"
     deb o'ylamasin. "Chiqish" tugmasi natija ustida turadi. */
  const f = $('#oqForma'); if(f) f.style.display = 'none';
  const t0 = $('#oqTushuntirish'); if(t0) t0.style.display = 'none';
  const tel = $('#oqPhone'); if(tel && !tel.value) tel.value = formatUzNumber(o.tel);
  if(KAB_YUKLANDI) return;      /* bir marta — keyin qayta so'rov yubormaymiz */
  KAB_YUKLANDI = true;
  lookupOrders();
}
document.addEventListener('click', (e)=>{
  if(e.target.closest('[data-kabchiq]')){ e.preventDefault(); KAB_YUKLANDI = false; kabUnut(); }
});

function kabShartnomaHtml(c){
  const val = c.currency === 'USD' ? ' $' : (' ' + SUM());
  const foiz = c.jamiOy ? Math.round(c.tolanganOy / c.jamiOy * 100) : 0;
  const kech = Number(c.kechikkanOy) || 0;

  return `<div class="rescard">
    <span class="rb" style="background:${kech ? 'var(--red)' : 'var(--gold)'}"></span>
    <div class="rh">
      <span class="id sg">${esc(c.contractId)}</span>
      <span class="tag ${kech ? 'red' : (c.qolganSumma === 0 ? 'green' : 'vip')}" style="margin-left:auto">
        ${kech ? (LANG==='ru' ? kech+' мес. просрочка' : kech + ' oy kechikdi')
               : (c.qolganSumma === 0 ? (LANG==='ru'?'ПОГАШЕН':'TO\'LANDI') : (LANG==='ru'?'АКТИВЕН':'AMALDA'))}
      </span>
    </div>
    <div style="display:flex;align-items:flex-end;gap:12px">
      <div style="flex:1;min-width:0">
        <div class="big sg">${esc(shortNumber(c.number))}</div>
        <div class="sub">${esc(c.tolanganOy)} / ${esc(c.jamiOy)} ${t('oy')} ${LANG==='ru'?'оплачено':'to\'langan'}</div>
      </div>
      <div class="amt sg">${formatPrice(c.qolganSumma)}${esc(val)}</div>
    </div>

    <div class="kab-bar" aria-hidden="true"><i style="width:${foiz}%"></i></div>

    <div class="kab-qator">
      <span>${LANG==='ru'?'Оплачено':'To\'langan'}</span>
      <b>${formatPrice(c.tolanganSumma)}${esc(val)}</b>
    </div>
    ${c.keyingiSana ? `<div class="kab-qator">
      <span>${LANG==='ru'?'Следующий платёж':'Keyingi to\'lov'}</span>
      <b${kech ? ' style="color:var(--red)"' : ''}>${esc(c.keyingiSana)} · ${formatPrice(c.monthlyPayment)}${esc(val)}</b>
    </div>` : ''}

    <!-- V128: to'lovlar jadvali endi TEPADAGI kartochkadan ochiladi
         (mijoz so'rovi). Bu yerda takrorlanmaydi. -->

    <button class="btn ghost kab-pdf" data-kabpdf="${esc(c.contractId)}" style="margin-top:12px">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M8 11.5l4 4 4-4"></path><path d="M5 19h14"></path></svg>
      <span>${t('Shartnomani yuklab olish')}</span>
    </button>
  </div>`;
}

/* ==================================================================
   TO'LOVLAR JADVALI OYNASI (V128)
   ------------------------------------------------------------------
   Tepadagi kartochka bosilganda ochiladi. Ichida har bir shartnoma
   bo'yicha: jami/to'langan/qolgan va oyma-oy ro'yxat (sana, summa,
   holat). Ilgari bu jadval pastdagi shartnoma kartochkasining ichida
   edi — mijoz so'roviga ko'ra u yerdan olib tashlandi va shu yerga
   ko'chirildi.
   ================================================================== */
function prfJadvalOch(){
  const shList = (KAB_SHARTNOMALAR && KAB_SHARTNOMALAR.length) ? KAB_SHARTNOMALAR : [];
  if(!shList.length) return;
  const ru = LANG === 'ru';

  const boliklar = shList.map(c => {
    const val = c.currency === 'USD' ? ' $' : (' ' + SUM());
    const qatorlar = (c.oylar || []).map(o => {
      const belgi = o.holat === 'tolandi' ? '✓' : (o.holat === 'kechikdi' ? '!' : '·');
      return `<div class="kab-oy kab-${esc(o.holat)}">
        <span class="kab-oy-n">${esc(o.oy)}</span>
        <span class="kab-oy-s">${esc(o.sana)}</span>
        <span class="kab-oy-p">${formatPrice(o.summa)}${esc(val)}</span>
        <span class="kab-oy-b">${belgi}</span>
      </div>`;
    }).join('');
    return `<div style="margin-bottom:20px">
      <div class="eyebrow" style="padding:0 4px;margin-bottom:10px">
        ${esc(c.contractId || '')} · ${esc(shortNumber(c.number || ''))}
      </div>
      <div class="prf-sh-bosh">
        <div><span>${ru?'Оплачено':"To'langan"}</span><b>${esc(c.tolanganOy)}/${esc(c.jamiOy)} ${t('oy')}</b></div>
        <div style="text-align:right"><span>${ru?'Остаток':'Qoldi'}</span>
          <b${Number(c.kechikkanOy) ? ' style="color:var(--red)"' : ''}>${formatPrice(c.qolganSumma)}${esc(val)}</b></div>
      </div>
      <div class="kab-oylar prf-jadval-sh">${qatorlar}</div>
    </div>`;
  }).join('');

  $('#genTitle').textContent = ru ? 'График платежей' : "To'lovlar jadvali";
  const ft = $('#genFoot'); if(ft) ft.style.display = 'none';
  /* Rasmiy tushuntirish — kartochkadagi spidometr nimani bildirishini
     aytadi. Kartochkada joy oz, shuning uchun to'liq izoh shu yerda. */
  const legend = `<div class="prf-legend">
    <div><i style="background:#4FBF8E"></i>${ru?'Без просрочки':"Kechikish yo'q"}</div>
    <div><i style="background:#F5B942"></i>${ru?'1 месяц просрочки':'1 oy kechikkan'}</div>
    <div><i style="background:#F2644E"></i>${ru?'2 и более месяцев':'2 va undan ko\'p oy'}</div>
  </div>`;
  $('#genBody').innerHTML = legend + boliklar;
  openSheet('shGen');
}

/* Kartochka bosilganda yoki klaviaturadan Enter/Probel bosilganda */
document.addEventListener('click', (e)=>{
  /* "Chiqish" tugmasi kartochka ichida — uning bosilishi jadvalni
     ochmasligi kerak. */
  if(e.target.closest('[data-kabchiq]')) return;
  if(e.target.closest('[data-prfjadval]')){ e.preventDefault(); prfJadvalOch(); }
});
document.addEventListener('keydown', (e)=>{
  if(e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target && e.target.closest && e.target.closest('[data-prfjadval]');
  if(el){ e.preventDefault(); prfJadvalOch(); }
});

/* Kabinetdan kelgan shartnomalar — jadval oynasi uchun eslab qolinadi. */
let KAB_SHARTNOMALAR = [];

/* Kabinetdagi "Shartnomani yuklab olish" — shartnoma ID'si allaqachon
   bizda, telefon ham: mijozdan hech narsa so'ralmaydi. */
document.addEventListener('click', async (e)=>{
  const b = e.target.closest('[data-kabpdf]');
  if(!b) return;
  const id = b.dataset.kabpdf;
  const asl = b.innerHTML;
  b.disabled = true; b.textContent = t('Tayyorlanmoqda…');
  try{
    const res = await withClientTimeout(fetch(FN + 'generate-contract-pdf', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ contractId: id, phone: KAB_TEL })
    }), kutishVaqti(20000));
    const r = await res.json();
    if(!r.ok || !r.pdfBase64){ toast(r.error || t('Shartnoma tayyorlanmadi'), 'bad'); return; }
    const chars = atob(r.pdfBase64);
    const bytes = new Uint8Array(chars.length);
    for(let i=0;i<chars.length;i++) bytes[i] = chars.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' }));
    window.open(url, '_blank');
    setTimeout(()=> URL.revokeObjectURL(url), 60000);
    toast(LANG==='ru'?'Договор скачан':'Shartnoma yuklab olindi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
  }finally{
    b.disabled = false; b.innerHTML = asl;
  }
});

/* ==================================================================
   SHARTNOMA HOLATI (check-contract-status + generate-contract-pdf)
   ================================================================== */
const CONTRACT_STATUS = {
  active:     { label:"To'lov muvaffaqiyatli bajarilmoqda", tag:'green' },
  trouble:    { label:"To'lov uzilishlari ko'p",            tag:'vip' },
  cancelling: { label:'Shartnoma bekor qilish jarayonida',  tag:'red' },
  cancelled:  { label:"Shartnoma bekor bo'ldi",             tag:'red' },
  completed:  { label:'Shartnoma muvaffaqiyatli yakunlandi',tag:'green' }
};
let lastContractId = '';

async function lookupContract(){
  const idVal = ($('#ctId').value||'').trim().toUpperCase();
  const phone = extractRawDigits($('#ctPhone').value);
  const box = $('#ctResult');
  if(!idVal){ toast(LANG==='ru'?'Введите ID договора':'Shartnoma ID sini kiriting','bad'); return; }
  if(phone.length < 9){ toast(LANG==='ru'?'Введите полный номер телефона':"To'liq telefon raqamini kiriting",'bad'); return; }
  const btn = $('#ctBtn'); btn.disabled = true; btn.textContent = t('Tekshirilmoqda…');
  box.innerHTML = skeletons(2);
  try{
    const res = await withClientTimeout(fetch(FN + 'check-contract-status', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ contractId: idVal, phone })
    }), kutishVaqti(12000));
    const r = await res.json();
    if(!r.ok || !r.data){
      box.innerHTML = emptyBox(IC_WARN, t('Topilmadi'), r.error || "Ma'lumot topilmadi. ID va raqamni tekshiring.", null, null, true);
      return;
    }
    lastContractId = idVal;      /* MUHIM: server contractId qaytarmaydi — PDF uchun shuni ishlatamiz */
    const d = r.data;
    const st = CONTRACT_STATUS[d.contractStatus] || { label: d.contractStatus || '—', tag:'grey' };
    const pays = Array.isArray(d.payments) ? d.payments : [];
    const paid = pays.filter(p => p.status === 'paid').length;
    const pct = pays.length ? Math.round(paid / pays.length * 100) : 0;
    const now = Date.now();

    const R = 40, C = 2 * Math.PI * R;
    box.innerHTML = `
      <div class="card" style="background:var(--navy-grad);border-color:transparent;color:#fff;position:relative;overflow:hidden">
        <div style="position:absolute;right:-40px;top:-50px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(230,200,119,.22),transparent 68%)"></div>
        <div style="position:relative" class="ringwrap">
          <div class="ring">
            <svg viewBox="0 0 92 92" width="92" height="92" aria-hidden="true">
              <circle cx="46" cy="46" r="${R}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="8"></circle>
              <circle cx="46" cy="46" r="${R}" fill="none" stroke="#E6C877" stroke-width="8" stroke-linecap="round"
                      stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct/100)).toFixed(1)}"></circle>
            </svg>
            <span class="mid"><b class="sg" style="color:#fff">${pct}%</b><i style="color:#A9BCD6">${paid}/${pays.length}</i></span>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:10.5px;font-weight:800;letter-spacing:.12em;color:#8EA3C0;text-transform:uppercase">${t('Shartnoma')}</div>
            <div class="sg" style="margin-top:5px;font-size:19px;font-weight:700;color:#E6C877">${esc(idVal)}</div>
            <div style="margin-top:7px;font-size:12.5px;color:#C9D6E8;font-weight:650">${esc(d.customerName||'')}</div>
            <div class="sg" style="margin-top:3px;font-size:12.5px;color:#A9BCD6;font-weight:600">${esc(shortNumber(d.number||''))}</div>
          </div>
        </div>
      </div>

      <div class="rescard" style="margin-top:11px">
        <span class="rb" style="background:${st.tag==='green'?'var(--green)':st.tag==='red'?'var(--red)':'var(--gold)'}"></span>
        <div style="display:flex;align-items:center;gap:11px">
          <span class="tag ${st.tag}">${t('HOLAT')}</span>
          <span style="flex:1;font-size:13px;font-weight:700">${esc(st.label)}</span>
        </div>
      </div>

      <div class="rescard" style="margin-top:11px">
        <div style="display:flex;align-items:center">
          <span class="eyebrow" style="flex:1">${t("To'lovlar jadvali")}</span>
          <span class="sg" style="font-size:12.5px;font-weight:700;color:var(--text-3)">${formatPrice(d.monthlyPayment)} ${SUM()}/${t('oy')}</span>
        </div>
        <div style="margin-top:8px">
          ${pays.map(p => {
            const over = p.status === 'pending' && p.dueDate && p.dueDate < now;
            const done = p.status === 'paid';
            const dd = p.dueDate ? sanaUz(p.dueDate) : '—';
            return `<div class="payrow">
              <span class="pn" style="background:${done?'var(--green)':over?'var(--red)':'var(--card-3)'};color:${done||over?'#fff':'var(--muted)'}">${done?'✓':(p.month||'•')}</span>
              <span class="pt">${p.month?p.month+'-'+t("to'lov"):t("to'lov")} · ${esc(dd)}</span>
              <span class="tag ${done?'green':over?'red':'grey'}">${done?t("TO'LANDI"):over?t('KECHIKMOQDA'):t('KUTILMOQDA')}</span>
            </div>`;
          }).join('')}
        </div>
      </div>

      <button class="btn" id="ctPdf" style="margin-top:12px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M8 11.5l4 4 4-4"></path><path d="M5 19h14"></path></svg>
        ${t('Shartnomani yuklab olish')}</button>`;
  }catch(err){
    box.innerHTML = emptyBox(IC_WARN, t("Tekshirib bo'lmadi"), xatoMatni(err), null, null, true);
  }finally{
    btn.disabled = false; btn.textContent = t('Holatni tekshirish');
  }
}

async function downloadContractPdf(){
  const btn = $('#ctPdf'); if(!btn) return;
  const phone = extractRawDigits($('#ctPhone').value);
  btn.disabled = true; btn.textContent = t('Tayyorlanmoqda…');
  try{
    const res = await withClientTimeout(fetch(FN + 'generate-contract-pdf', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
      body: JSON.stringify({ contractId: lastContractId, phone })
    }), kutishVaqti(20000));
    const r = await res.json();
    if(!r.ok || !r.pdfBase64){ toast(r.error || 'Shartnoma tayyorlanmadi', 'bad'); return; }
    const chars = atob(r.pdfBase64);
    const bytes = new Uint8Array(chars.length);
    for(let i=0;i<chars.length;i++) bytes[i] = chars.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type:'application/pdf' }));
    window.open(url, '_blank');
    setTimeout(()=> URL.revokeObjectURL(url), 60000);
    toast(LANG==='ru'?'Договор скачан':'Shartnoma yuklab olindi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
  }finally{
    btn.disabled = false; btn.innerHTML = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M8 11.5l4 4 4-4"></path><path d="M5 19h14"></path></svg> ${t('Shartnomani yuklab olish')}`;
  }
}

/* ==================================================================
   MAXSUS RAQAM BUYURTMASI (number_price_categories + custom_orders)
   ================================================================== */
const CO = { pattern:'', operator:'', data:null, loading:false };

function openCustom(){
  CO.pattern = ''; CO.operator = ''; CO.data = null;
  $('#genTitle').textContent = t('Maxsus raqam buyurtmasi');
  $('#genFoot').style.display = 'none';
  renderCustom();
  openSheet('shGen');
}
function renderCustom(){
  const ops = ['Ucell','Humans','Beeline','Mobiuz','Uzmobile','Perfektum'];
  const d = CO.data;
  let priceBox = '';
  if(CO.loading) priceBox = '<div class="sk shim" style="height:90px;margin-top:12px"></div>';
  else if(CO.pattern.length === 4 && CO.operator){
    if(d){
      const price = (d.onSale && d.salePrice ? d.salePrice : (d.fullPrice||0))
                  + (d.onSale && d.saleMonthlyTariff ? d.saleMonthlyTariff : (d.monthlyTariff||0));
      priceBox = `<div class="card" style="margin-top:12px">
        <div class="eyebrow">Taxminiy narx</div>
        <div class="sg" style="margin-top:8px;font-size:23px;font-weight:700">${formatPrice(price)} <span style="font-family:'Plus Jakarta Sans';font-size:12px;color:var(--muted-2);font-weight:600">so'm</span></div>
        ${d.installmentAvailable && d.installmentMonthly ? `<div style="margin-top:7px;font-size:12.5px;color:var(--blue-text);font-weight:700">${formatPrice(d.installmentMonthly)} so'mdan / ${d.installmentMonths||0} oy${d.downPayment?` · bosh to'lov ${formatPrice(d.downPayment)}`:''}</div>` : ''}
        ${d.ownershipTransfer ? '<div style="margin-top:7px;font-size:11.5px;color:var(--green);font-weight:700">Raqam nomingizga rasmiylashtiriladi</div>' : ''}
      </div>`;
    }else{
      priceBox = `<div class="card" style="margin-top:12px;display:flex;gap:11px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linecap="round" aria-hidden="true" style="margin-top:1px"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v5.5M12 7.8v.4"></path></svg>
        <div style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.5">Bu kombinatsiya uchun narx hali belgilanmagan. Ariza qoldiring — menejer narxni aytadi.</div>
      </div>`;
    }
  }

  $('#genBody').innerHTML = `
    <div style="font-size:12.5px;color:var(--text-2);font-weight:600;line-height:1.55">Kerakli raqamning <b>oxirgi 4 ta</b> raqamini va operatorni tanlang — biz siz uchun qidiramiz.</div>
    <div class="digits" style="margin-top:14px;max-width:230px" id="coDigits">
      <input type="text" inputmode="numeric" maxlength="1" placeholder="1" data-c="0" aria-label="1-raqam">
      <input type="text" inputmode="numeric" maxlength="1" placeholder="2" data-c="1" aria-label="2-raqam">
      <input type="text" inputmode="numeric" maxlength="1" placeholder="3" data-c="2" aria-label="3-raqam">
      <input type="text" inputmode="numeric" maxlength="1" placeholder="4" data-c="3" aria-label="4-raqam">
    </div>
    <div class="eyebrow" style="margin-top:16px">Operator</div>
    <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
      ${ops.map(op => `<button class="chip${CO.operator===op?' on':''}" data-coop="${esc(op)}"><i class="dotc" style="background:${opMeta(op).color}"></i>${esc(op)}</button>`).join('')}
    </div>
    ${priceBox}
    <div class="fld" style="margin-top:16px" id="coName"><label for="coInName">Ism familiyangiz</label>
      <div class="inp"><input id="coInName" type="text" placeholder="ASADBEK RUSTAMOV" data-upper autocapitalize="characters" spellcheck="false"></div></div>
    <div class="fld" style="margin-top:12px" id="coPhone"><label for="coInPhone">Telefon raqamingiz</label>
      <div class="inp"><span class="sg" style="font-size:14.5px;font-weight:700;color:var(--text-3)">+998</span><span style="width:1px;height:22px;background:var(--line-2)"></span><input id="coInPhone" type="tel" inputmode="numeric" placeholder="90 123 45 67"></div></div>
    <div class="fld" style="margin-top:12px" id="coRegion"><label for="coInRegion">Viloyat</label>
      <div class="inp"><select id="coInRegion"><option value="">Tanlang</option>${REGIONS.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('')}</select>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--faint)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></div></div>
    <button class="btn" id="coSubmit" style="margin-top:16px">Arizani yuborish</button>
    <div style="height:6px"></div>`;

  setTimeout(()=>{
    const boxes = $$('#coDigits input');
    boxes.forEach((b,i)=>{
      b.value = CO.pattern[i] || '';
      b.addEventListener('input', ()=>{
        b.value = b.value.replace(/\D/g,'').slice(0,1);
        if(b.value && boxes[i+1]) boxes[i+1].focus();
        CO.pattern = boxes.map(x=>x.value).join('');
        if(CO.pattern.length === 4 && CO.operator) loadCustomPrice();
      });
      b.addEventListener('keydown', e => { if(e.key==='Backspace' && !b.value && boxes[i-1]) boxes[i-1].focus(); });
    });
    const p = $('#coInPhone');
    /* iPhone: yozayotganda tegilmaydi, format chiqishda qo'yiladi */
    if(p){ p.setAttribute('inputmode','tel');
      p.addEventListener('input', ()=>{ $('#coPhone').classList.remove('bad'); });
      p.addEventListener('blur', ()=>{ p.value = formatUzNumber(extractRawDigits(p.value)); }); }
  }, 0);
}
async function loadCustomPrice(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  CO.loading = true; renderCustom();
  try{
    const doc = await withClientTimeout(db.collection('number_price_categories').doc(`${CO.operator}_${CO.pattern}`).get(), kutishVaqti(8000));
    CO.data = doc.exists ? doc.data() : null;
  }catch(e){ CO.data = null; }
  CO.loading = false; renderCustom();
}
async function submitCustom(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  const name = ($('#coInName').value||'').trim();
  const raw = extractRawDigits($('#coInPhone').value);
  const region = $('#coInRegion').value;
  let ok = true;
  $('#coName').classList.toggle('bad', name.length < 2); if(name.length < 2) ok = false;
  $('#coPhone').classList.toggle('bad', raw.length !== 9); if(raw.length !== 9) ok = false;
  $('#coRegion').classList.toggle('bad', !region); if(!region) ok = false;
  if(CO.pattern.length !== 4){ toast(LANG==='ru'?'Введите все 4 цифры':"4 ta raqamni to'liq kiriting",'bad'); ok = false; }
  if(!CO.operator){ toast(LANG==='ru'?'Выберите оператора':'Operatorni tanlang','bad'); ok = false; }
  if(!ok) return;

  const btn = $('#coSubmit'); btn.disabled = true; btn.textContent = t('Yuborilmoqda…');
  const d = CO.data;
  try{
    await db.collection('custom_orders').add({
      pattern: CO.pattern,
      operator: CO.operator,
      name, region, phone: '+998 ' + formatUzNumber(raw),
      status:'Yangi', source:'Sayt',
      fullPrice:            d ? (d.fullPrice||0) : 0,
      monthlyTariff:        d ? (d.monthlyTariff||0) : 0,
      onSale:               d ? !!d.onSale : false,
      salePrice:            d ? (d.salePrice||0) : 0,
      saleMonthlyTariff:    d ? (d.saleMonthlyTariff||0) : 0,
      installmentAvailable: d ? !!d.installmentAvailable : false,
      installmentMonths:    d ? (d.installmentMonths||0) : 0,
      installmentMonthly:   d ? (d.installmentMonthly||0) : 0,
      downPayment:          d ? (d.downPayment||0) : 0,
      ownershipTransfer:    d ? !!d.ownershipTransfer : false,
      tariffMonths:         d ? (d.tariffMonths||0) : 0,
      createdAt: sanaVaqtUz(new Date()),
      createdAtSort: Date.now()
    });
    $('#genBody').innerHTML = `<div style="text-align:center;padding:26px 0">
      <span style="width:80px;height:80px;border-radius:50%;background:var(--green-tint);display:inline-flex;align-items:center;justify-content:center">
        <span style="width:56px;height:56px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4.5 4.5L19 8"></path></svg></span></span>
      <h3 style="margin-top:16px;font-size:19px">Ariza qabul qilindi</h3>
      <p style="margin:9px auto 0;font-size:13px;color:var(--muted);font-weight:600;line-height:1.6;max-width:280px">
        <b class="sg" style="color:var(--ink)">•••• ${esc(CO.pattern)}</b> (${esc(CO.operator)}) bo'yicha qidiramiz va tez orada bog'lanamiz.</p>
      <button class="btn" data-close style="margin-top:20px">Yopish</button>
    </div>`;
    toast(LANG==='ru'?'Заявка отправлена':'Ariza yuborildi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
    btn.disabled = false; btn.textContent = t('Arizani yuborish');
  }
}

/* ==================================================================
   FAQ / BIZ HAQIMIZDA / ISH O'RINLARI
   ================================================================== */
const FAQ = [
  ["Raqam qanday nomimga o'tkaziladi?",
   "To'lovlar to'liq yakunlangandan so'ng 5 (besh) ish kuni ichida operator ofisida abonent shartnomasi sizning nomingizga rasmiylashtiriladi. Buning uchun pasportingiz asl nusxasi bilan shaxsan hozir bo'lishingiz shart. Rasmiylashtirilgandan so'ng tomonlar qabul qilish dalolatnomasini imzolaydi."],
  ["Bo'lib to'lash uchun nima kerak?",
   "Pasportingiz va JSHSHIR raqamingiz yetarli. Menejer siz bilan bog'lanib, muddat (6, 12, 24 yoki 36 oy) va oylik to'lov miqdorini kelishib oladi, so'ng rasmiy shartnoma tuziladi."],
  ["To'lovni kechiktirsam nima bo'ladi?",
   "To'lov muddatidan 30 (o'ttiz) kun va undan ortiq kechikilsa, shartnoma bir tomonlama tarzda bekor hisoblanadi. Shu sababli to'lov qiyinchiligi tug'ilsa, oldindan menejerga xabar bering — ko'p holatlarda muddatni qayta kelishish mumkin."],
  ["Yetkazib berish qancha turadi?",
   "O'zbekiston bo'ylab yetkazib berish bepul. Toshkent shahri bo'yicha odatda shu kuni, viloyatlarga 1–3 ish kunida yetkaziladi. Kuryer bilan birga shartnoma va SIM-karta keladi."],
  ["Buyurtmam holatini qanday bilaman?",
   "«Buyurtma» bo'limida telefon raqamingiz va sotib olingan raqamning oxirgi 4 ta raqamini kiriting — barcha buyurtmalaringiz holati ko'rinadi."],
  ["Shartnomani qayerdan yuklab olaman?",
   "«Buyurtma» bo'limidagi «Shartnoma» yorlig'iga o'ting, shartnoma ID va telefon raqamingizni kiriting. Holat bilan birga shartnomaning PDF nusxasini ham yuklab olasiz."]
];
function openFaq(){
  $('#genTitle').textContent = t('Savol-javob');
  $('#genFoot').style.display = 'none';
  $('#genBody').innerHTML = `<div class="list">${FAQ.map((f,i)=>`
    <div class="acc${i===0?' on':''}" data-acc>
      <button class="q"><b>${esc(f[0])}</b>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" style="margin-top:2px;color:var(--muted-2)"><path class="vb" d="M12 6v12"></path><path d="M6 12h12"></path></svg>
      </button>
      <div class="a">${esc(f[1])}</div>
    </div>`).join('')}</div>
    <div class="card" style="margin-top:12px;background:var(--blue-tint);border-color:transparent;display:flex;align-items:center;gap:12px">
      <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L5 20l1.3-4.1A7.5 7.5 0 1 1 20 12z"></path></svg>
      <span style="flex:1;font-size:12.5px;color:var(--blue-ink);font-weight:650;line-height:1.5">Javob topmadingizmi? Operatorga yozing.</span>
      <a class="btn sm" href="${esc(SETTINGS.telegramLink || 'https://t.me/Vip_raqamlar_admin')}" target="_blank" rel="noopener" style="flex:none">Yozish</a>
    </div><div style="height:6px"></div>`;
  openSheet('shGen');
}

/* ==================================================================
   OFIS MANZILI  ("Biz haqimizda" oynasida)
   Koordinata admin panelning "Sozlamalar" bo'limidan olinadi
   (site_settings/general → officeLat / officeLng). Kiritilmagan bo'lsa
   standart qiymat ishlatiladi — ya'ni blok har doim ishlaydi.
   "Xaritani ochish" telefonda Yandex Xarita / Yandex Go ilovasini
   ochadi (o'rnatilmagan bo'lsa — brauzerdagi xaritani).
   ================================================================== */
function ofisKoord(){
  const la = parseFloat(SETTINGS.officeLat), ln = parseFloat(SETTINGS.officeLng);
  return {
    lat: Number.isFinite(la) ? la : 41.289757,
    lng: Number.isFinite(ln) ? ln : 69.201657
  };
}
function ofisBloki(){
  const { lat, lng } = ofisKoord();
  const manzil = esc(SETTINGS.officeAddress || (LANG==='ru' ? 'г. Ташкент' : 'Toshkent shahri'));
  const nom = encodeURIComponent('VIP RAQAMLAR');
  const xarita = `https://yandex.uz/maps/?pt=${lng},${lat}&z=17&l=map&text=${nom}`;
  const yol    = `https://yandex.uz/maps/?rtext=~${lat},${lng}&rtt=auto`;
  return `
    <div class="card ofis" style="margin-top:12px">
      <div class="ofis-top">
        <span class="ofis-pin">
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"></path><circle cx="12" cy="10" r="2.6"></circle></svg>
        </span>
        <span class="ofis-txt">
          <b>${t('Bizning manzil')}</b>
          <i>${manzil}</i>
        </span>
      </div>
      <div class="ofis-map" aria-hidden="true">
        <span class="ofis-dot"></span>
      </div>
      <div class="ofis-btns">
        <a class="btn" href="${xarita}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4.5 3.5 6.8v13L9 17.5l6 3 5.5-2.3v-13L15 7.5z"></path><path d="M9 4.5v13M15 7.5v13"></path></svg>
          ${t('Xaritani ochish')}
        </a>
        <a class="btn ghost" href="${yol}" target="_blank" rel="noopener">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h7a3 3 0 0 0 3-3V7"></path><path d="M13 4.5 16 7l-3 2.5"></path><circle cx="5" cy="17" r="2.4"></circle><path d="M7.4 17H18a3 3 0 0 0 0-6"></path></svg>
          ${t("Yo'nalish")}
        </a>
      </div>
    </div>`;
}

function openAbout(){
  $('#genTitle').textContent = t('Biz haqimizda');
  $('#genFoot').style.display = 'none';
  $('#genBody').innerHTML = `
    <div class="card" style="background:var(--navy-grad);border-color:transparent;color:#fff;position:relative;overflow:hidden">
      <div style="position:absolute;right:-40px;top:-50px;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle,rgba(230,200,119,.2),transparent 68%)"></div>
      <div style="position:relative">
        <div style="font-size:10px;font-weight:800;letter-spacing:.14em;color:#E6C877">VIP RAQAMLAR</div>
        <div style="margin-top:10px;font-size:13px;color:#C9D6E8;font-weight:600;line-height:1.65">O'zbekiston bo'ylab chiroyli, oltin va VIP telefon raqamlarini tanlash va sotib olish xizmati.</div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <div style="font-size:13px;color:var(--text-2);font-weight:600;line-height:1.65">Biz mijozlarimizga barcha operatorlar (Beeline, Ucell, Uzmobile, Mobiuz, Humans, Perfektum) raqamlarini keng katalog orqali taqdim etamiz, O'zbekiston bo'ylab bepul yetkazib berish va bo'lib to'lash (kredit) imkoniyatini beramiz.</div>
    </div>
    ${ofisBloki()}
    <div class="rows" style="margin-top:12px">
      <a class="row" href="tel:+998878880101"><span class="ri" style="background:var(--green-tint);color:var(--green)"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.7 1.5A16.5 16.5 0 0 1 5 5.2 1.5 1.5 0 0 1 6.5 3.5z"></path></svg></span><span class="rt"><b>Qo'ng'iroq</b><i class="sg">+998 87 888 01 01</i></span></a>
      <a class="row" href="${esc(SETTINGS.telegramLink || 'https://t.me/Vip_raqamlar_admin')}" target="_blank" rel="noopener"><span class="ri" style="background:var(--blue-tint);color:var(--blue)"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 5L10.5 13.5 3.5 10.5z"></path><path d="M21 5l-7 15-3.5-6.5"></path></svg></span><span class="rt"><b>Telegram</b><i>@Vip_raqamlar_admin</i></span></a>
      <a class="row" href="https://vipraqamlar.uz"><span class="ri"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"></path></svg></span><span class="rt"><b>Veb-sayt</b><i>vipraqamlar.uz</i></span></a>
    </div>
    <div style="margin-top:18px;text-align:center;font-size:10.5px;color:var(--muted-2);font-weight:600;line-height:1.7">© 2026 VIP RAQAMLAR (vipraqamlar.uz)<br>Barcha huquqlar himoyalangan.</div>
    <div style="height:6px"></div>`;
  openSheet('shGen');
}

let VACANCIES = [], vacPick = null;
async function openJobs(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  $('#genTitle').textContent = t("Bo'sh ish o'rinlari");
  $('#genFoot').style.display = 'none';
  $('#genBody').innerHTML = skeletons(3);
  openSheet('shGen');
  try{
    const snap = await withClientTimeout(db.collection('vacancies').where('active','==',true).get(), kutishVaqti(9000));
    VACANCIES = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      .sort((a,b)=> (a.order ?? a.createdAt ?? 0) - (b.order ?? b.createdAt ?? 0));
  }catch(e){ VACANCIES = []; }
  renderJobs();
}
function renderJobs(){
  if(!VACANCIES.length){
    $('#genBody').innerHTML = emptyBox(IC_BOX, t("Hozircha bo'sh o'rin yo'q"), "Yangi vakansiyalar chiqqanda shu yerda ko'rinadi. Telegram kanalimizni kuzatib boring.", null);
    return;
  }
  $('#genBody').innerHTML = `<div class="list">${VACANCIES.map(v => `
    <div class="card">
      <div style="display:flex;align-items:flex-start;gap:12px">
        <span style="width:38px;height:38px;border-radius:12px;background:var(--blue-tint);color:var(--blue);display:flex;align-items:center;justify-content:center;flex:none"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="7.5" width="17" height="12" rx="2"></rect><path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2"></path></svg></span>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:800">${esc(v.title||'')}</div>
          ${(v.salaryMin||v.salaryMax)?`<div class="sg" style="margin-top:5px;font-size:12.5px;color:var(--green);font-weight:700">${formatPrice(v.salaryMin||0)}${v.salaryMax?' – '+formatPrice(v.salaryMax):''} so'm</div>`:''}
        </div>
      </div>
      ${v.description?`<div style="margin-top:11px;font-size:12.5px;color:var(--text-2);font-weight:600;line-height:1.6;white-space:pre-line">${esc(v.description)}</div>`:''}
      <button class="btn sm" data-vac="${esc(v.id)}" style="margin-top:13px;width:100%;background:var(--blue);color:#fff">Ariza qoldirish</button>
    </div>`).join('')}</div><div style="height:6px"></div>`;
}
function openVacForm(id){
  vacPick = VACANCIES.find(v => v.id === id); if(!vacPick) return;
  $('#genTitle').textContent = t('Ariza');
  $('#genBody').innerHTML = `
    <div class="card"><div class="eyebrow">Lavozim</div><div style="margin-top:6px;font-size:15px;font-weight:800">${esc(vacPick.title||'')}</div></div>
    <div class="fld" style="margin-top:14px" id="vfName"><label for="vfInName">Ism familiyangiz</label><div class="inp"><input id="vfInName" type="text" placeholder="ASADBEK RUSTAMOV" data-upper autocapitalize="characters" spellcheck="false"></div></div>
    <div class="fld" style="margin-top:12px" id="vfPhone"><label for="vfInPhone">Telefon raqamingiz</label><div class="inp"><span class="sg" style="font-size:14.5px;font-weight:700;color:var(--text-3)">+998</span><span style="width:1px;height:22px;background:var(--line-2)"></span><input id="vfInPhone" type="tel" inputmode="numeric" placeholder="90 123 45 67"></div></div>
    <div class="fld" style="margin-top:12px"><label for="vfInExp">Tajribangiz</label><div class="inp" style="align-items:flex-start"><textarea id="vfInExp" rows="4" placeholder="Qisqacha yozing (ixtiyoriy)"></textarea></div></div>
    <label style="margin-top:14px;display:flex;align-items:flex-start;gap:10px">
      <input id="vfConsent" type="checkbox" style="width:20px;height:20px;margin-top:1px;accent-color:var(--blue)">
      <span style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.5">Shaxsiy ma'lumotlarim ishga qabul qilish maqsadida qayta ishlanishiga roziman</span>
    </label>
    <button class="btn" id="vfSubmit" style="margin-top:16px" disabled>Arizani yuborish</button><div style="height:6px"></div>`;
  setTimeout(()=>{
    const p = $('#vfInPhone');
    p.setAttribute('inputmode','tel');
    p.addEventListener('input', ()=>{ $('#vfPhone').classList.remove('bad'); });
    p.addEventListener('blur', ()=>{ p.value = formatUzNumber(extractRawDigits(p.value)); });
    $('#vfConsent').addEventListener('change', e => { $('#vfSubmit').disabled = !e.target.checked; });
  }, 0);
}
async function submitVac(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  const name = ($('#vfInName').value||'').trim();
  const raw = extractRawDigits($('#vfInPhone').value);
  const exp = ($('#vfInExp').value||'').trim().slice(0, 2900);
  let ok = true;
  $('#vfName').classList.toggle('bad', name.length < 2); if(name.length < 2) ok = false;
  $('#vfPhone').classList.toggle('bad', raw.length !== 9); if(raw.length !== 9) ok = false;
  if(!ok) return;
  const btn = $('#vfSubmit'); btn.disabled = true; btn.textContent = t('Yuborilmoqda…');
  try{
    /* DIQQAT: firestore.rules bu yerda ANIQ shu 8 ta maydonni talab qiladi */
    await db.collection('job_applications').add({
      vacancyId: vacPick.id,
      vacancyTitle: vacPick.title || '',
      fullName: name,
      phone: '+998 ' + formatUzNumber(raw),
      experience: exp,
      consentGiven: true,
      status: 'new',
      createdAt: FV.serverTimestamp()
    });
    try{
      const text = `💼 Yangi ish uchun ariza\n\n📋 Lavozim: ${vacPick.title}\n👤 Ism: ${name}\n☎️ Telefon: +998 ${formatUzNumber(raw)}\n${exp?`📝 Tajriba: ${exp}\n`:''}🕐 Vaqti: ${sanaVaqtUz(new Date())}`;
      fetch(FN + 'telegram-notify', { method:'POST', headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) }, body: JSON.stringify({ text }) }).catch(()=>{});
    }catch(e){}
    $('#genBody').innerHTML = `<div style="text-align:center;padding:26px 0">
      <span style="width:80px;height:80px;border-radius:50%;background:var(--green-tint);display:inline-flex;align-items:center;justify-content:center">
        <span style="width:56px;height:56px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4.5 4.5L19 8"></path></svg></span></span>
      <h3 style="margin-top:16px;font-size:19px">Arizangiz yuborildi</h3>
      <p style="margin:9px auto 0;font-size:13px;color:var(--muted);font-weight:600;line-height:1.6;max-width:280px">Tez orada siz bilan bog'lanamiz.</p>
      <button class="btn" data-close style="margin-top:20px">Yopish</button></div>`;
    toast(LANG==='ru'?'Заявка отправлена':'Ariza yuborildi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
    btn.disabled = false; btn.textContent = t('Arizani yuborish');
  }
}

/* ==================================================================
   HAMKOR BO'LISH — raqam sotuvchilar uchun ariza
   ------------------------------------------------------------------
   MIJOZ SO'ROVI: "diler bo'limini qo'sh, faqat to'liq ma'lumot
   berilmasin — hamkor bo'lish, ariza berish bo'lsin".

   Shu sabab bu yerda NARX, TARIF, FOIZ va boshqa shartlar
   KO'RSATILMAYDI. Faqat qisqa taklif va ariza formasi. Shartlarni
   admin arizani ko'rib chiqqandan keyin, odam bilan gaplashib
   aytadi — bu ham savdo nuqtai nazaridan to'g'riroq: narx oldindan
   ko'rinmasa, odam avval bog'lanadi.

   Ariza `hamkor_arizalari` to'plamiga tushadi va admin panelning
   "Sotuvchilar" bo'limida ko'rinadi. Telegram'ga ham xabar ketadi.
   ================================================================== */
function openHamkor(){
  $('#genTitle').textContent = t('Hamkor bo‘lish');
  $('#genBody').innerHTML = `
    <div class="card" style="display:flex;gap:12px;align-items:flex-start">
      <span style="width:40px;height:40px;border-radius:13px;background:var(--gold-tint);color:var(--gold-ink);display:flex;align-items:center;justify-content:center;flex:none">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 20v-1.8a3.2 3.2 0 0 0-3.2-3.2H6.2A3.2 3.2 0 0 0 3 18.2V20"></path><circle cx="9.5" cy="7.8" r="3.3"></circle><path d="M17 11.5h4M19 9.5v4"></path></svg></span>
      <div style="flex:1;min-width:0">
        <div style="font-size:15.5px;font-weight:800;line-height:1.3">${t('Raqamlaringizni biz orqali soting')}</div>
        <div style="margin-top:7px;font-size:12.5px;color:var(--text-2);font-weight:600;line-height:1.6">${t('Sizga shaxsiy kabinet ochib beramiz: raqamlaringizni o‘zingiz joylaysiz, narxini o‘zingiz belgilaysiz, buyurtmalar to‘g‘ridan-to‘g‘ri sizga tushadi.')}</div>
      </div>
    </div>

    <div class="list" style="margin-top:12px">
      ${[
        [t('Shaxsiy kabinet'), t('Raqam joylash, narx o‘zgartirish, statistika')],
        [t('Buyurtmalar sizga keladi'), t('Mijozning ismi va telefoni bilan')],
        [t('Nazorat sizda'), t('Qaysi raqamni qachon sotishni o‘zingiz hal qilasiz')]
      ].map(([a,b]) => `
      <div class="card" style="display:flex;gap:11px;align-items:flex-start;padding:13px 14px">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="var(--green)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="margin-top:2px;flex:none"><path d="M5 13l4.5 4.5L19 8"></path></svg>
        <div style="min-width:0"><div style="font-size:13.5px;font-weight:700">${a}</div>
        <div style="margin-top:3px;font-size:12px;color:var(--muted);font-weight:600;line-height:1.5">${b}</div></div>
      </div>`).join('')}
    </div>

    <div class="eyebrow" style="margin-top:20px">${t('Ariza qoldiring')}</div>
    <div style="margin-top:6px;font-size:12px;color:var(--muted);font-weight:600;line-height:1.55">${t('Shartlarni telefon orqali tushuntiramiz.')}</div>

    <div class="fld" style="margin-top:13px" id="hkName"><label for="hkInName">${t('Ism yoki firma nomi')}</label>
      <div class="inp"><input id="hkInName" type="text" placeholder="ASADBEK RUSTAMOV" data-upper autocapitalize="characters" spellcheck="false"></div></div>

    <div class="fld" style="margin-top:12px" id="hkPhone"><label for="hkInPhone">${t('Telefon raqamingiz')}</label>
      <div class="inp"><span class="sg" style="font-size:14.5px;font-weight:700;color:var(--text-3)">+998</span><span style="width:1px;height:22px;background:var(--line-2)"></span><input id="hkInPhone" type="tel" inputmode="numeric" placeholder="90 123 45 67"></div></div>

    <div class="fld" style="margin-top:12px" id="hkRegion"><label for="hkInRegion">${t('Viloyat')}</label>
      <div class="inp"><select id="hkInRegion" style="width:100%;background:transparent;border:none;color:inherit;font-family:inherit;font-size:14.5px;font-weight:600;outline:none">
        <option value="">${t('Tanlang')}</option>
        ${["Toshkent shahri","Toshkent viloyati","Andijon","Farg'ona","Namangan","Samarqand","Buxoro","Xorazm","Navoiy","Qashqadaryo","Surxondaryo","Jizzax","Sirdaryo","Qoraqalpog'iston"].map(r=>`<option>${r}</option>`).join('')}
      </select></div></div>

    <div class="fld" style="margin-top:12px"><label for="hkInCount">${t('Nechta raqamingiz bor')}</label>
      <div class="inp"><select id="hkInCount" style="width:100%;background:transparent;border:none;color:inherit;font-family:inherit;font-size:14.5px;font-weight:600;outline:none">
        <option value="1-10">1 – 10</option>
        <option value="10-50">10 – 50</option>
        <option value="50-200">50 – 200</option>
        <option value="200+">200 ${t('dan ko‘p')}</option>
      </select></div></div>

    <div class="fld" style="margin-top:12px"><label for="hkInNote">${t('Izoh')}</label>
      <div class="inp" style="align-items:flex-start"><textarea id="hkInNote" rows="3" placeholder="${t('Ixtiyoriy')}"></textarea></div></div>

    <label style="margin-top:14px;display:flex;align-items:flex-start;gap:10px">
      <input id="hkConsent" type="checkbox" style="width:20px;height:20px;margin-top:1px;accent-color:var(--blue)">
      <span style="font-size:12px;color:var(--text-2);font-weight:600;line-height:1.5">${t('Shaxsiy ma’lumotlarim hamkorlik bo‘yicha bog‘lanish maqsadida qayta ishlanishiga roziman')}</span>
    </label>

    <button class="btn" id="hkSubmit" style="margin-top:16px" disabled>${t('Arizani yuborish')}</button>
    <div style="height:6px"></div>`;

  setTimeout(()=>{
    const p = $('#hkInPhone');
    if(p){
      p.setAttribute('inputmode','tel');
      p.addEventListener('input', (e)=>{
        $('#hkPhone').classList.remove('bad');
        /* Bo'shliqlarni maydon o'zi qo'yadi (+998 chapda turadi).
           iPhone uchun: kursor oxirida bo'lsa va qiymat haqiqatan
           o'zgarsa; o'chirishda faqat oxirgi ajratgich olinadi. */
        const ochirish = !!(e && e.inputType && e.inputType.indexOf('delete') === 0);
        const y = formatUzNumber(extractRawDigits(p.value));
        if(y === p.value) return;
        if(ochirish){
          const t2 = p.value.replace(/\s+$/, '');
          if(t2 !== p.value){ p.value = t2; try{ p.setSelectionRange(t2.length, t2.length); }catch(e2){} }
          return;
        }
        if(p.selectionStart != null && p.selectionStart < p.value.length) return;
        p.value = y;
        try{ p.setSelectionRange(y.length, y.length); }catch(e2){}
      });
      p.addEventListener('blur', ()=>{ p.value = formatUzNumber(extractRawDigits(p.value)); });
    }
    const c = $('#hkConsent');
    if(c) c.addEventListener('change', e => { $('#hkSubmit').disabled = !e.target.checked; });
    /* Avval kiritgan ismi/telefoni bo'lsa — qayta yozmasin */
    try{
      const nm = localStorage.getItem('vip_name') || '';
      const ph = localStorage.getItem('vip_phone') || '';
      if(nm && $('#hkInName')) $('#hkInName').value = nm;
      if(ph && p) p.value = formatUzNumber(ph);
    }catch(e){}
  }, 0);
  openSheet('shGen');
}

async function submitHamkor(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  const name = ($('#hkInName').value || '').trim();
  const raw  = extractRawDigits($('#hkInPhone').value);
  const reg  = ($('#hkInRegion').value || '').trim();
  const cnt  = ($('#hkInCount').value || '').trim();
  const note = ($('#hkInNote').value || '').trim().slice(0, 900);

  let ok = true;
  $('#hkName').classList.toggle('bad', name.length < 2);   if(name.length < 2) ok = false;
  $('#hkPhone').classList.toggle('bad', raw.length !== 9);  if(raw.length !== 9) ok = false;
  $('#hkRegion').classList.toggle('bad', !reg);             if(!reg) ok = false;
  if(!ok) return;

  const btn = $('#hkSubmit'); btn.disabled = true; btn.textContent = t('Yuborilmoqda…');
  try{
    /* DIQQAT: firestore.rules bu yerda ANIQ shu 8 ta maydonni talab qiladi */
    await db.collection('hamkor_arizalari').add({
      fullName: name,
      phone: '+998 ' + formatUzNumber(raw),
      region: reg,
      numbersCount: cnt,
      note: note,
      consentGiven: true,
      status: 'new',
      createdAt: FV.serverTimestamp()
    });
    try{
      const text = '\u{1F91D} Yangi hamkorlik arizasi\n\n\u{1F464} ' + name +
        '\n☎️ +998 ' + formatUzNumber(raw) +
        '\n\u{1F4CD} ' + reg + '\n\u{1F522} Raqamlari: ' + cnt +
        (note ? '\n\u{1F4DD} ' + note : '') +
        '\n\u{1F550} ' + sanaVaqtUz(new Date());
      fetch(FN + 'telegram-notify', { method:'POST',
        headers:{ 'Content-Type':'application/json', ...(await getAppCheckHeaders()) },
        body: JSON.stringify({ text }) }).catch(()=>{});
    }catch(e){}
    try{ localStorage.setItem('vip_name', name); localStorage.setItem('vip_phone', raw); }catch(e){}

    $('#genBody').innerHTML = `<div style="text-align:center;padding:26px 0">
      <span style="width:80px;height:80px;border-radius:50%;background:var(--green-tint);display:inline-flex;align-items:center;justify-content:center">
        <span style="width:56px;height:56px;border-radius:50%;background:var(--green);display:flex;align-items:center;justify-content:center">
          <svg viewBox="0 0 24 24" width="29" height="29" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 13l4.5 4.5L19 8"></path></svg></span></span>
      <h3 style="margin-top:16px;font-size:19px">${t('Arizangiz yuborildi')}</h3>
      <p style="margin:9px auto 0;font-size:13px;color:var(--muted);font-weight:600;line-height:1.6;max-width:290px">${t('Tez orada siz bilan bog‘lanamiz va shartlarni tushuntiramiz.')}</p>
      <button class="btn" data-close style="margin-top:20px">${t('Yopish')}</button></div>`;
    toast(LANG === 'ru' ? 'Заявка отправлена' : 'Ariza yuborildi');
  }catch(err){
    toast(xatoMatni(err), 'bad');
    btn.disabled = false; btn.textContent = t('Arizani yuborish');
  }
}

/* ==================================================================
   BO'LIB TO'LASHGA RAQAMLAR (bosh sahifadagi premium kartochka ->)
   ------------------------------------------------------------------
   Kartochkalar KATALOGDAGI bilan AYNAN bir xil (numCard) — shu sabab
   "Batafsil", sevimlilar, buyurtma — hammasi avvalgidek ishlaydi.
   Har 15 tadan keyin "Yana ko'rsatish" tugmasi qoladi (PAGE_SIZE).
   ================================================================== */
let INS_SHOWN = PAGE_SIZE;

function bolibRoyxat(){
  return NUMBERS
    .filter(n => !n.reserved && installmentAllowed(n))
    .sort((a,b) => (a.price || 0) - (b.price || 0));
}

function openBolib(){
  INS_SHOWN = PAGE_SIZE;
  $('#genTitle').textContent = t("Bo'lib to'lashga raqamlar");
  $('#genFoot').style.display = 'none';
  renderBolib();
  openSheet('shGen');
  try{ if(typeof track === 'function') track('bolib_tolash_royxati'); }catch(e){}
}

const IC_WALLET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="17" cy="14.5" r="1.2" fill="currentColor" stroke="none"/></svg>';

function renderBolib(){
  const list = bolibRoyxat();
  const body = $('#genBody');
  if(!body) return;
  if(!list.length){
    body.innerHTML = emptyBox(IC_BOX, t('Raqam topilmadi'),
      LANG === 'ru' ? 'Сейчас нет номеров в рассрочку.' : "Hozircha bo'lib to'lashga raqam yo'q.", null);
    return;
  }
  const bor = list.slice(0, INS_SHOWN);
  const qoldi = list.length - INS_SHOWN;
  body.innerHTML =
    `<div class="ins-head">
       <span class="ic">${IC_WALLET}</span>
       <div style="flex:1;min-width:0">
         <b>${esc(list.length + ' ' + t('raqam'))}</b>
         <i>${esc(t("Oldindan to'lovsiz, rasmiy shartnoma bilan"))}</i>
       </div>
     </div>
     <div class="list">${bor.map(n => numCard(n)).join('')}</div>` +
    (qoldi > 0
      ? `<button class="btn ghost" id="insMore" style="margin-top:16px">${t("Yana ko'rsatish")} (${Math.min(PAGE_SIZE, qoldi)})</button>`
      : '');
  requestAnimationFrame(()=>{ if(typeof upperAll === 'function') upperAll(body); });
}

/* ==================================================================
   XABARLAR (admin paneldan yuborilgan bildirishnomalar)
   ------------------------------------------------------------------
   Qanday ishlaydi:
     • Admin panel "Saytga xabar" bo'limida xabar yozadi va u
       site_settings/xabarlar hujjatiga yoziladi (BITTA hujjat —
       shu sabab mijoz brauzeri uchun BITTA o'qish, baza xarajati
       deyarli nol).
     • Sayt ochilganda shu hujjat o'qiladi. O'qilmagan xabarlar
       soni tepadagi qo'ng'iroqchada chiqadi.
     • Yangi va "muhim" xabar bo'lsa — tepadan katta kompaniyalar
       ilovasidagi push bildirishnoma kabi kartochka tushadi.
     • Qaysi xabar o'qilgani telefonning o'zida saqlanadi
       (localStorage) — hech qanday shaxsiy ma'lumot yuborilmaydi.
   ================================================================== */
let MSGS = [];
const MSG_KEY = 'vip_xabar_oqildi';

function msgOqilgan(){
  try{ return JSON.parse(localStorage.getItem(MSG_KEY) || '[]') || []; }catch(e){ return []; }
}
function msgOqilganYoz(ids){
  try{ localStorage.setItem(MSG_KEY, JSON.stringify(ids.slice(-200))); }catch(e){}
}
function msgOqilmagan(){
  const o = new Set(msgOqilgan());
  return MSGS.filter(m => !o.has(m.id));
}
function msgVaqt(ms){
  const d = Number(ms) || 0;
  if(!d) return '';
  const farq = Date.now() - d;
  const daq = Math.floor(farq / 60000);
  if(daq < 1) return t('hozir');
  if(daq < 60) return daq + ' ' + t('daqiqa oldin');
  const soat = Math.floor(daq / 60);
  if(soat < 24) return soat + ' ' + t('soat oldin');
  const kun = Math.floor(soat / 24);
  if(kun === 1) return t('kecha');
  if(kun < 7) return kun + ' ' + t('kun oldin');
  try{
    /* V121: `uz-UZ` lokali brauzerda sanani ISO tartibida beradi, shu
       sabab o'zbekcha ko'rinish O'ZIMIZDA yig'iladi. Ruscha esa
       lokalning o'zidan olinadi (u to'g'ri ishlaydi). */
    if(LANG === 'ru') return new Date(d).toLocaleDateString('ru-RU', { day:'numeric', month:'short' });
    const OYLAR = ['yan','fev','mar','apr','may','iyn','iyl','avg','sen','okt','noy','dek'];
    const dd = new Date(d);
    return dd.getDate() + '-' + OYLAR[dd.getMonth()];
  }catch(e){ return ''; }
}

/* Faqat yoqilgan va muddati o'tmagan xabarlar */
function msgFiltr(list){
  const hozir = Date.now();
  return (list || [])
    .filter(m => m && m.id && m.title)
    .filter(m => m.active !== false)
    .filter(m => !m.until || Number(m.until) > hozir)
    .sort((a,b) => (Number(b.at) || 0) - (Number(a.at) || 0))
    .slice(0, 30);
}

async function xabarlarniYukla(){
  await firebaseniKut();   /* V145: Firebase kechiktirib yuklanadi — tayyor bo'lsa darhol qaytadi */
  try{
    const doc = await withClientTimeout(
      db.collection('site_settings').doc('xabarlar').get(), kutishVaqti(9000));
    if(!doc.exists) return;
    MSGS = msgFiltr((doc.data() || {}).list);
    try{ localStorage.setItem('vip_xabar_kesh', JSON.stringify(MSGS)); }catch(e){}
    msgBelginiYangila();
    msgPushniKorsat();
  }catch(e){}
}
function xabarlarKeshdan(){
  try{
    const c = localStorage.getItem('vip_xabar_kesh');
    if(c){ MSGS = msgFiltr(JSON.parse(c)); msgBelginiYangila(); }
  }catch(e){}
}

function msgBelginiYangila(){
  const n = msgOqilmagan().length;
  [['bellCnt','bellBtn'],['bellCnt2','bellBtn2']].forEach(([c])=>{
    const cnt = document.getElementById(c);
    if(!cnt) return;
    /* Tugmaga HECH QANDAY sinf qo'shilmaydi — u joyida qimirlamay
       turadi. Faqat kichik son ko'rinadi/yo'qoladi. */
    cnt.style.display = n ? '' : 'none';
    cnt.textContent = n > 9 ? '9+' : String(n);
  });
}

const IC_MSG   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6.5h16v11H8.5L4 20.5z"/></svg>';
const IC_OGOH  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4l8.5 15H3.5z"/><path d="M12 10v4M12 16.5v.5"/></svg>';
const IC_FIRE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3 3.2 5.5 5.6 5.5 9a5.5 5.5 0 0 1-11 0c0-1.7.8-3 2-4.3.3 1.3 1.1 2 2.2 2 .8-2.6.4-4.6 1.3-6.7z"/></svg>';

function msgIkon(kind){
  if(kind === 'ogoh') return IC_OGOH;
  if(kind === 'aksiya') return IC_FIRE;
  return IC_MSG;
}

function openXabarlar(){
  pushniYop();                       /* tepadagi bildirishnoma yo'q bo'lsin */
  $('#genTitle').textContent = t('Xabarlar');
  $('#genFoot').style.display = 'none';
  renderXabarlar();
  openSheet('shGen');
  /* DIQQAT: oyna ochilgani bilan hammasi "o'qilgan" bo'lib
     QOLMAYDI. Katta ilovalardagi kabi: har bir xabar BOSILGANDA
     ochiladi va aynan o'sha o'qilgan hisoblanadi. Shunda mijoz
     qaysinisini ko'rganini aniq biladi. */
  try{ if(typeof track === 'function') track('xabarlar_ochildi'); }catch(e){}
}

/* Bitta xabarni ochish/yopish */
function msgBos(id){
  const karta = document.querySelector('.msg[data-msg="' + CSS.escape(id) + '"]');
  if(!karta) return;
  const ochiq = karta.classList.toggle('open');
  if(ochiq && karta.classList.contains('unread')){
    karta.classList.remove('unread');
    const o = msgOqilgan();
    if(o.indexOf(id) === -1){ o.push(id); msgOqilganYoz(o); }
    msgBelginiYangila();
    try{ haptic('light'); }catch(e){}
  }
}

function renderXabarlar(){
  const body = $('#genBody'); if(!body) return;
  if(!MSGS.length){
    body.innerHTML = emptyBox(IC_MSG, t('Xabar yo\'q'),
      LANG === 'ru' ? 'Новых сообщений пока нет.' : "Hozircha yangi xabar yo'q.", null);
    return;
  }
  const oqilgan = new Set(msgOqilgan());
  const yangiSon = MSGS.filter(m => !oqilgan.has(m.id)).length;

  /* Tepada qisqa sarhisob — nechtasi o'qilmagani darhol ko'rinadi */
  const bosh = yangiSon
    ? `<div class="msg-head"><span class="msg-nuq"></span>${esc(yangiSon + ' ' + t('ta yangi xabar'))}
         <button type="button" class="msg-all" id="msgAll">${t('Hammasini o\'qildi')}</button></div>`
    : `<div class="msg-head done">${IC_OK_S}${esc(t('Hammasi o\'qilgan'))}</div>`;

  body.innerHTML = bosh + MSGS.map(m => {
    const yangi = !oqilgan.has(m.id);
    const kind = String(m.kind || 'xabar');
    return `<div class="msg k-${esc(kind)}${yangi ? ' unread' : ''}" data-msg="${esc(m.id)}">
      <button type="button" class="msg-qator" data-msgopen="${esc(m.id)}">
        <span class="msg-ic">${m.image ? `<img src="${esc(m.image)}" alt="" loading="lazy" decoding="async">` : msgIkon(kind)}</span>
        <span class="msg-b">
          <span class="msg-t">${esc(m.title)}</span>
          ${m.body ? `<span class="msg-p">${esc(m.body)}</span>` : ''}
          <span class="msg-d">${esc(msgVaqt(m.at))}</span>
        </span>
        <span class="msg-dot" aria-hidden="true"></span>
        <span class="msg-chev" aria-hidden="true">${IC_CHEV}</span>
      </button>
      <div class="msg-ochiq"><div class="msg-ichki">
        ${m.body ? `<div class="msg-x">${esc(m.body)}</div>` : ''}
        ${m.link ? `<button class="msg-go" data-msglink="${esc(m.link)}">${esc(m.linkText || t("Ko'rish"))}</button>` : ''}
      </div></div>
    </div>`;
  }).join('');
}

const IC_OK_S = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const IC_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg>';

/* "Hammasini o'qildi" */
function msgHammasi(){
  msgOqilganYoz(MSGS.map(m => m.id));
  msgBelginiYangila();
  renderXabarlar();
  try{ haptic('ok'); }catch(e){}
}

/* ---- Telefonga tushadigan push ko'rinishi ----
   Faqat BIR MARTA, faqat eng yangi o'qilmagan xabar uchun va faqat
   admin "muhim" belgisini qo'ygan bo'lsa chiqadi. */
let pushTimer = null;
function msgPushniKorsat(){
  const box = document.getElementById('pushBox'); if(!box) return;
  const oqilmagan = msgOqilmagan().filter(m => m.push !== false);
  const m = oqilmagan[0];
  if(!m) return;
  try{
    const k = 'vip_push_' + m.id;
    if(sessionStorage.getItem(k)) return;
    sessionStorage.setItem(k, '1');
  }catch(e){}

  const nom = document.getElementById('pushTitle');
  const mat = document.getElementById('pushBody');
  const vaq = document.getElementById('pushWhen');
  if(nom) nom.textContent = m.title || '';
  if(mat) mat.textContent = m.body || '';
  if(vaq) vaq.textContent = msgVaqt(m.at);

  box.style.display = 'flex';
  /* `display` qo'yilgach, o'tish (transition) ishlashi uchun brauzer
     boshlang'ich holatni bir marta hisoblab olishi kerak. Ilgari bu
     ikkita requestAnimationFrame bilan qilinardi — lekin telefon band
     bo'lsa rAF sekinlashadi va bildirishnoma bir necha soniya kechikib
     chiqardi. Endi qisqa taymer: band telefonda ham o'z vaqtida. */
  void box.offsetWidth;
  setTimeout(()=>{
    box.classList.add('show');
    try{ haptic('ok'); }catch(e){}
  }, 40);
  clearTimeout(pushTimer);
  pushTimer = setTimeout(pushniYop, 7000);

  box.onclick = ()=>{ if(box.surilganmi && box.surilganmi()) return; pushniYop(); setTimeout(openXabarlar, 180); };

  /* Surib yuborish — saytdagi boshqa bildirishnomalar bilan BIR XIL:
     yonga sursa yonga, yuqoriga sursa yuqoriga uchib ketadi. */
  if(!box.__surish){
    box.__surish = 1;
    surishBogla(box, {
      yon: 'tepa',
      asos: 'translateX(-50%) ',
      toxtat: ()=> clearTimeout(pushTimer),
      davom:  ()=> { clearTimeout(pushTimer); pushTimer = setTimeout(pushniYop, 4000); },
      yopish: ()=>{
        /* Qo'lda uchirilganda `transform` biz qo'ygan holatda qoladi —
           shu sabab avval tozalab, keyin yashiramiz. */
        clearTimeout(pushTimer);
        box.classList.remove('show');
        box.style.transition = ''; box.style.transform = ''; box.style.opacity = '';
        box.style.display = 'none';
      }
    });
  }
}
function pushniYop(){
  const box = document.getElementById('pushBox'); if(!box) return;
  clearTimeout(pushTimer);
  box.classList.remove('show'); box.classList.add('go');
  setTimeout(()=>{ box.classList.remove('go'); box.style.display = 'none'; }, 560);
}

/* ==================================================================
   STORY KO'RISH OYNASI
   ------------------------------------------------------------------
   Boshqaruv:
     • o'ng tomonni bossa — keyingisi, chap tomonni — oldingisi;
     • 5 soniyada o'zi keyingisiga o'tadi (tepadagi chiziq bilan);
     • bosib turganda TO'XTAYDI, qo'yib yuborganda QOLGAN vaqtdan
       davom etadi (ilgari har doim 1.8 s qo'yilardi — noto'g'ri edi);
     • pastga sursa yoki ✕ — yopiladi;
     • yurakcha yoki IKKI MARTA bosish — "yoqdi" (telefonda eslanadi);
     • keyingi rasm oldindan yuklanadi — o'tish paytida kutish yo'q.

   HISOBLAGICHLAR server funksiyasi orqali (api-story-stat): brauzer
   bazaga to'g'ridan yozmaydi, shu sabab hisobni soxtalashtirib
   bo'lmaydi. Server javobida yangi sonlar qaytadi.
   ================================================================== */
const ST_DAVOM = 5000;        // bitta RASM kadri necha millisekund turadi
let ST_QOLDI = ST_DAVOM;      // to'xtatilganda qolgan vaqt
let ST_YURDI = 0;             // hozirgi kadr qachon boshlangan
let ST_KADR = 0;              // hozirgi story ichidagi kadr raqami
let ST_OVOZ = false;          // video ovozi yoqilganmi (mijoz tanlaydi)
let ST_NAVBAT = 0;            // yuklash navbati (eskisi bekor qilinadi)
const STORY_OBJS = {};        // savdo raqamlari — buyurtma oynasi uchun

/* Server funksiyasiga so'rov. Javob kelmasa — jim o'tib ketamiz
   (hisoblagich sayt ishlashiga ta'sir qilmaydi). */
async function stStat(amal, id){
  try{
    const r = await fetch(FN + 'api-story-stat', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ amal, id })
    });
    if(!r.ok) return null;
    const j = await r.json();
    return (j && j.ok) ? j : null;
  }catch(e){ return null; }
}

/* Hozirgi story'ning kadrlari */
function stvKadrlar(){
  const s = STORIES[ST_IDX];
  return s ? stKadrlar(s) : [];
}

function stvVideoni(toxtat){
  const vd = $('#stvVid');
  if(!vd) return;
  try{ if(toxtat) vd.pause(); else if(vd.src) vd.play().catch(()=>{}); }catch(e){}
}

function stvYop(){
  clearTimeout(ST_TIMER);
  ST_NAVBAT++;                /* kutayotgan yuklash bekor bo'lsin */
  const yk = $('#stvYuk'); if(yk) yk.style.display = 'none';
  const vd = $('#stvVid');
  if(vd){ try{ vd.pause(); vd.removeAttribute('src'); vd.load(); }catch(e){} }
  const v = $('#stView');
  if(v){
    /* Qaytishda ham o'sha kartochkaga "yig'iladi". Agar lenta
       aylantirilgan bo'lsa, joyi qaytadan o'lchanadi. */
    stvManbaOlchov(ST_MANBA);
    v.classList.add('ketmoqda');
    v.classList.remove('savdo-bor');
    const vt = v;
    setTimeout(()=>{
      vt.classList.remove('on');
      vt.classList.remove('ketmoqda');
    }, 240);
  }
  document.body.style.overflow = '';
  ST_IDX = -1;
  ST_MANBA = null;
}

function stvKorildi(s){
  /* Ko'rishlar: shu seansda bir marta. Server ham IP bo'yicha
     takrorini sanamaydi — ya'ni ikki qatlam himoya. */
  let kor;
  try{ kor = new Set(JSON.parse(sessionStorage.getItem(ST_KOR_KEY) || '[]')); }
  catch(e){ kor = new Set(); }
  if(kor.has(s.id)) return;
  kor.add(s.id);
  try{ sessionStorage.setItem(ST_KOR_KEY, JSON.stringify(Array.from(kor).slice(-200))); }catch(e){}
  stStat('kor', s.id);
  renderStories();        /* halqa "ko'rilgan" holatiga o'tadi */
}

/* ---------- RASM KESHI ----------
   V88 (mijoz so'rovi: "oq bo'lib turib keyin ochilyabdi").
   Ilgari faqat KEYINGI bitta rasm oldindan yuklanardi — mijoz tez
   bossa, rasm hali kelmagan bo'lardi va kadr BO'SH ochilardi.
   Endi: story ochilishi bilan uning HAMMA rasmlari (10 tagacha,
   har biri ~200 KB) va keyingi story'ning birinchi rasmi oldindan
   yuklanadi. Rasm obyektlari shu keshda saqlanadi — demak kadr
   almashganda brauzer uni qaytadan so'ramaydi, DARHOL chizadi. */
const ST_RASM_KESH = new Map();

function stvRasmOl(url){
  let im = ST_RASM_KESH.get(url);
  if(!im){
    im = new Image();
    im.decoding = 'async';
    im.src = url;
    ST_RASM_KESH.set(url, im);
    /* Kesh cheksiz o'smasin */
    if(ST_RASM_KESH.size > 40){
      const birinchi = ST_RASM_KESH.keys().next().value;
      ST_RASM_KESH.delete(birinchi);
    }
  }
  return im;
}
function stvRasmTayyor(url){
  const im = ST_RASM_KESH.get(url);
  return !!(im && im.complete && im.naturalWidth);
}

/* Hozirgi story'ning hamma rasmlari + keyingisining birinchisi */
function stvOldin(){
  stvKadrlar().forEach(k => { if(k.tur === 'rasm') stvRasmOl(k.url); });
  const s2 = STORIES[ST_IDX + 1];
  if(s2){
    const k2 = stKadrlar(s2).find(k => k.tur === 'rasm');
    if(k2) stvRasmOl(k2.url);
  }
}

/* ---------- SAVDO BLOKI ----------
   Admin kadrga raqam va narx qo'ygan bo'lsa, pastda kartochka chiqadi.
   Bosilganda saytning O'Z buyurtma oynasi ochiladi: raqam katalogda
   bo'lsa o'sha hujjat, bo'lmasa "jonli" raqam sifatida (xuddi kun
   tavsiyasidagi kabi) — shu sabab buyurtma bazaga to'g'ri yoziladi. */
function stvSavdoChiz(kadr){
  const box = $('#stvSavdo'), v = $('#stView');
  const sv = kadr && kadr.savdo;
  if(!sv){ box.classList.remove('bor'); v.classList.remove('savdo-bor'); return; }

  const raqamlar = String(sv.raqam || '').replace(/\D/g, '').slice(-9);
  const bor = NUMBERS.find(n => String(n.number || '').replace(/\D/g, '').slice(-9) === raqamlar);
  const narx = Number(sv.narx) || 0;
  const oyiga = Number(sv.oyiga) || 0;
  const eski = Number(sv.eskiNarx) || 0;

  $('#stvSvRaqam').textContent = bor ? shortNumber(bor.number) : stvRaqamChiroy(raqamlar);
  /* Narx BIR QATORDA sig'ishi kerak (ekran surati bilan tekshirildi:
     uzun matn ikki qatorga tushib, kartochka siqilib qolardi).
     Bo'lib to'lash bo'lsa — oylik summa, aks holda to'liq narx;
     eski narx esa faqat bo'lib to'lash YO'Q paytda chizib ko'rsatiladi. */
  $('#stvSvNarx').innerHTML = oyiga
    ? esc(formatPrice(oyiga)) + ' ' + esc(t("so'm")) + '/' + esc(t('oy'))
    : esc(formatPrice(narx)) + ' ' + esc(t("so'm"))
      + (eski > narx ? '<s>' + esc(formatPrice(eski)) + '</s>' : '');
  $('#stvSvBtn').textContent = t('Buyurtma');

  /* Katalogda bo'lmasa — "jonli" raqam yasaymiz */
  const id = bor ? bor.id : ('story:' + raqamlar);
  if(!bor){
    STORY_OBJS[id] = {
      id, number: '+998 ' + stvRaqamChiroy(raqamlar), operator: sv.operator || '',
      price: narx, oldPrice: eski, installment: oyiga > 0, monthly24: oyiga,
      currency: 'UZS', live: true, reserved: false, tier: sv.tier || ''
    };
  }
  $('#stvSvBtn').onclick = (e)=>{
    e.stopPropagation();
    stvYop();
    setTimeout(()=>{ try{ openOrder(id); }catch(err){} }, 120);
  };
  box.classList.add('bor');
  v.classList.add('savdo-bor');
}
/* "901234567" -> "90 123 45 67" */
function stvRaqamChiroy(d){
  d = String(d || '').replace(/\D/g, '');
  if(d.length !== 9) return d;
  return d.slice(0,2) + ' ' + d.slice(2,5) + ' ' + d.slice(5,7) + ' ' + d.slice(7);
}

/* Tepadagi vaqt chiziqlari — HOZIRGI story'ning KADRLARI bo'yicha
   (Instagram'dagi kabi: har bir rasm/video uchun alohida chiziq). */
function stvChiziqlar(jami, davom){
  $('#stvBars').innerHTML = Array.from({ length: jami }, (_, i) =>
    `<i class="${i < ST_KADR ? 'tugadi' : (i === ST_KADR ? 'hozir' : '')}"><span></span></i>`).join('');
  const hozir = $('#stvBars .hozir span');
  if(hozir) hozir.style.animationDuration = Math.max(600, davom) + 'ms';
}

/* Yangi kadr qaysi tomondan kirib kelsin: +1 o'ngdan, -1 chapdan,
   0 — animatsiyasiz (oyna endi ochilganda). */
let ST_YON = 0;

function stvOtish(ram){
  ram.classList.remove('kir-ong', 'kir-chap', 'suriladi', 'qaytadi');
  ram.style.transform = '';
  if(!ST_YON) return;
  /* Animatsiyani qayta ishga tushirish uchun brauzerni "uyg'otamiz" */
  void ram.offsetWidth;
  ram.classList.add(ST_YON > 0 ? 'kir-ong' : 'kir-chap');
}

function stvChiz(){
  const s = STORIES[ST_IDX];
  if(!s){ stvYop(); return; }
  const kadrlar = stvKadrlar();
  if(!kadrlar.length){ stvKeyingi(1); return; }
  if(ST_KADR >= kadrlar.length) ST_KADR = kadrlar.length - 1;
  if(ST_KADR < 0) ST_KADR = 0;
  const kadr = kadrlar[ST_KADR];
  const likes = stSet(ST_LIKE_KEY);

  const ram = $('#stvRamka'), im = $('#stvImg'), fon = $('#stvFon'), vd = $('#stvVid'), ov = $('#stvOvoz');
  clearTimeout(ST_TIMER);

  /* ---------- TAYYOR BO'LMAGUNCHA ESKI KADR TURADI ----------
     Mijoz so'rovi: "yonni bossa rasm oq bo'lib turib keyin ochilyabdi".
     Sabab — kadr darhol almashtirilardi, rasm esa keyin kelardi.
     Endi tartib boshqacha: avval media TAYYORLANADI, faqat shundan
     keyin ekran almashadi. Kutilayotgan paytda eski kadr ko'rinib
     turadi va ustida kichik aylana aylanadi (180 ms dan keyin — ya'ni
     keshdagi rasmda u umuman ko'rinmaydi).
     `navbat` — mijoz kutmasdan yana bossa, eski yuklash BEKOR bo'ladi
     va ekranda faqat oxirgi tanlangan kadr chiziladi. */
  const navbat = ++ST_NAVBAT;
  const yuk = $('#stvYuk');
  const yukKorsat = (b)=>{ if(yuk) yuk.style.display = b ? '' : 'none'; };

  function chizib(davom){
    if(navbat !== ST_NAVBAT) return;        /* mijoz boshqa kadrga o'tdi */
    yukKorsat(false);
    ram.classList.remove('keldi'); im.classList.remove('keldi');
    fon.classList.remove('keldi'); vd.classList.remove('keldi');
    stvOtish(ram);

    if(kadr.tur === 'video'){
      im.removeAttribute('src'); im.style.display = 'none';
      fon.removeAttribute('src');
      vd.style.display = '';
      ov.classList.add('bor');
      vd.muted = !ST_OVOZ;
      stvOvozIc();
      ram.classList.add('keldi'); vd.classList.add('keldi');
      try{ vd.currentTime = 0; vd.play().catch(()=>{}); }catch(e){}
    }else{
      try{ vd.pause(); vd.removeAttribute('src'); }catch(e){}
      vd.style.display = 'none';
      ov.classList.remove('bor');
      im.style.display = '';
      im.src = kadr.url;
      fon.src = kadr.url;        /* xira orqa fon — o'sha rasmning nusxasi */
      ram.classList.add('keldi'); im.classList.add('keldi'); fon.classList.add('keldi');
    }

    $('#stvAva').src = stRasmOk(s.doira) ? s.doira : (kadr.tur === 'rasm' ? kadr.url : '');
    $('#stvNom').textContent = s.nom || '';
    const lk = $('#stvLike');
    lk.classList.toggle('on', likes.has(s.id));
    $('#stvLikeN').textContent = stSonAniq(stLikeSoni(s));
    stvSavdoChiz(kadr);
    stvHavola(s, kadr);

    stvChiziqlar(kadrlar.length, davom);
    ST_QOLDI = davom; ST_YURDI = Date.now();
    clearTimeout(ST_TIMER);
    ST_TIMER = setTimeout(()=> stvKeyingi(1), davom);

    stvKorildi(s);
    stvOldin();
  }

  if(kadr.tur === 'video'){
    /* ---- VIDEO: birinchi kadri kelguncha kutamiz ---- */
    vd.src = kadr.url;
    const boshla = ()=>{
      const d = Math.min(30000, Math.max(1500,
        (isFinite(vd.duration) && vd.duration > 0) ? vd.duration * 1000 : (kadr.davomMs || 8000)));
      chizib(d);
    };
    if(vd.readyState >= 2) boshla();
    else{
      yukKorsat(true);
      vd.onloadeddata = boshla;
      vd.onerror = ()=>{ if(navbat === ST_NAVBAT){ yukKorsat(false); stvKeyingi(1); } };
      /* Juda sekin internet — 6 soniyadan keyin baribir ko'rsatamiz */
      setTimeout(()=>{ if(navbat === ST_NAVBAT && vd.readyState < 2) boshla(); }, 6000);
    }
  }else{
    /* ---- RASM: keshda bo'lsa DARHOL, bo'lmasa kelguncha kutamiz ---- */
    if(stvRasmTayyor(kadr.url)){
      chizib(ST_DAVOM);
    }else{
      yukKorsat(true);
      const rasm = stvRasmOl(kadr.url);
      const tayyor = ()=>{ chizib(ST_DAVOM); };
      rasm.addEventListener('load', tayyor, { once: true });
      rasm.addEventListener('error', ()=>{
        if(navbat === ST_NAVBAT){ yukKorsat(false); stvKeyingi(1); }
      }, { once: true });
      /* Zaxira: 4 soniyada kelmasa ham ekranni band qilib turmaymiz */
      setTimeout(()=>{ if(navbat === ST_NAVBAT && yuk && yuk.style.display !== 'none') chizib(ST_DAVOM); }, 4000);
    }
  }
}

/* Havola tugmasi (savdo bloki bo'lmagan kadrlarda) */
function stvHavola(s, kadr){
  const go = $('#stvGo');

  /* XAVFSIZLIK: havola FAQAT https:// yoki saytning o'z bo'limi (#/...)
     bo'lsa ko'rsatiladi. Boshqa har qanday havola (javascript:, data:,
     http:) butunlay e'tiborsiz qoldiriladi. */
  const hav = String(s.havola || '').trim();
  const havOk = /^https:\/\/[^\s"'<>]+$/i.test(hav) || /^#\/[A-Za-z0-9\-\/]*$/.test(hav);
  if(havOk && !(kadr && kadr.savdo)){
    go.style.display = '';
    go.textContent = t("Ko'rish");
    go.href = hav;
    go.rel = 'noopener noreferrer';
    if(/^https:/i.test(hav)) go.target = '_blank'; else go.removeAttribute('target');
  }else{
    go.style.display = 'none';
    go.removeAttribute('href');
  }
}

function stvOvozIc(){
  const on = ST_OVOZ;
  $('#stvOvozIc').innerHTML = on
    ? '<path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M16.5 8.5a5 5 0 0 1 0 7"></path>'
    : '<path d="M4 9v6h4l5 4V5L8 9H4z"></path><path d="M17 10l4 4M21 10l-4 4"></path>';
}

/* Keyingi/oldingi: avval KADRLAR ichida yuradi, tugasa — keyingi story */
function stvKeyingi(yon){
  ST_YON = yon > 0 ? 1 : -1;
  const kadrlar = stvKadrlar();
  const yangiKadr = ST_KADR + yon;
  if(yangiKadr >= 0 && yangiKadr < kadrlar.length){
    ST_KADR = yangiKadr;
    stvChiz();
    return;
  }
  const yangi = ST_IDX + yon;
  if(yangi < 0){ ST_KADR = 0; stvChiz(); return; }
  if(yangi >= STORIES.length){ stvYop(); return; }
  ST_IDX = yangi;
  /* Orqaga qaytganda oldingi story'ning OXIRGI kadridan boshlanadi */
  ST_KADR = (yon < 0) ? Math.max(0, stKadrlar(STORIES[yangi]).length - 1) : 0;
  stvChiz();
}

/* Oyna QAYSI kartochkadan ochilganini eslab qolamiz — yopilganda
   aynan o'sha joyga qaytadi (Instagram/TikTok'dagi kabi). */
let ST_MANBA = null;

/* Oynani bosilgan kartochkaning JOYIDAN ochish.
   Qanday ishlaydi: kartochkaning ekrandagi o'rni o'lchanadi va oynaga
   CSS o'zgaruvchilari sifatida beriladi; CSS esa oynani o'sha nuqtadan
   kattalashtirib chiqaradi. Faqat `transform` va `opacity` o'zgaradi —
   ya'ni animatsiya videokartada bajariladi, sahifa qayta chizilmaydi. */
function stvManbaOlchov(el){
  const v = $('#stView');
  if(!v) return;
  if(!el || !el.getBoundingClientRect){
    v.style.removeProperty('--stv-x');
    v.style.removeProperty('--stv-y');
    v.style.removeProperty('--stv-s');
    return;
  }
  const q = el.getBoundingClientRect();
  const ekW = window.innerWidth, ekH = window.innerHeight;
  /* Kartochka markazidan ekran markazigacha bo'lgan siljish */
  const dx = (q.left + q.width / 2) - ekW / 2;
  const dy = (q.top + q.height / 2) - ekH / 2;
  const s = Math.max(0.12, Math.min(0.6, q.width / ekW));
  v.style.setProperty('--stv-x', dx.toFixed(1) + 'px');
  v.style.setProperty('--stv-y', dy.toFixed(1) + 'px');
  v.style.setProperty('--stv-s', s.toFixed(3));
}

function stvOch(i, manba){
  if(!STORIES.length) return;
  ST_IDX = Math.max(0, Math.min(STORIES.length - 1, Number(i) || 0));
  ST_KADR = 0;
  ST_YON = 0;                 /* oyna ochilganda yon animatsiya kerak emas */
  ST_MANBA = manba || null;
  const v = $('#stView');
  stvManbaOlchov(ST_MANBA);
  v.classList.remove('ketmoqda');
  v.classList.add('on');
  document.body.style.overflow = 'hidden';
  stvChiz();
  try{ haptic('ok'); }catch(e){}
}

/* Ekran o'rtasida uchib chiqadigan katta yurakcha */
function stvPuf(){
  const v = $('#stView'); if(!v) return;
  const d = document.createElement('div');
  d.className = 'stv-puf';
  d.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.4S3.6 15 3.6 9.4A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.4 2.4c0 5.6-8.4 11-8.4 11z"/></svg>';
  v.appendChild(d);
  setTimeout(()=>{ try{ d.remove(); }catch(e){} }, 820);
}

/* yoqdi/olib tashlash. `puf` — o'rtada yurakcha ko'rsatilsinmi. */
function stvLike(puf){
  const s = STORIES[ST_IDX];
  if(!s) return;
  const likes = stSet(ST_LIKE_KEY);
  const bor = likes.has(s.id);
  if(bor) likes.delete(s.id); else likes.add(s.id);
  stSaqla(ST_LIKE_KEY, likes);

  /* Ekranda DARHOL o'zgaradi (serverni kutmaymiz) */
  s.likes = Math.max(0, (Number(s.likes) || 0) + (bor ? -1 : 1));
  $('#stvLike').classList.toggle('on', !bor);
  $('#stvLikeN').textContent = stSonAniq(stLikeSoni(s));
  if(!bor && puf !== false) stvPuf();
  try{ haptic(bor ? 'light' : 'ok'); }catch(e){}

  /* Server haqiqiy sonni qaytarsa — moslashtiramiz */
  stStat(bor ? 'like-ol' : 'like', s.id).then(j => {
    if(!j) return;
    if(typeof j.likes === 'number') s.likes = j.likes;
    if(typeof j.likesBaza === 'number') s.likesBaza = j.likesBaza;
    if(STORIES[ST_IDX] === s) $('#stvLikeN').textContent = stSonAniq(stLikeSoni(s));
    try{ stKeshYoz(); }catch(e){}
  });
}

(function stvBogla(){
  const v = document.getElementById('stView');
  if(!v) return;
  document.getElementById('stvClose').addEventListener('click', stvYop);
  document.getElementById('stvLike').addEventListener('click', ()=> stvLike(true));
  document.getElementById('stvGo').addEventListener('click', ()=> setTimeout(stvYop, 60));
  document.getElementById('stvOvoz').addEventListener('click', (e)=>{
    e.stopPropagation();
    ST_OVOZ = !ST_OVOZ;
    const vd = document.getElementById('stvVid');
    if(vd) vd.muted = !ST_OVOZ;
    stvOvozIc();
  });

  /* ----- Chap/o'ng zona: BIR marta bosish — o'tish,
           IKKI marta bosish — "yoqdi" (haqiqiy ilovalardagi kabi).
           Shu sabab bitta bosishni 240 ms kutib turamiz. ----- */
  let ikki = null;
  /* SURILDIMI. Brauzer qisqa surishdan keyin ham `click` yuboradi —
     natijada barmoq bilan ozgina surib qo'yib yuborilsa, kadr
     surishdan ham, "bosish" dan ham o'tib ketardi (sinovda aniqlandi:
     25 px surishdan keyin kadr almashib qolardi). Shu sabab surish
     bo'lgan bo'lsa, undan keyingi bitta `click` e'tiborsiz qoldiriladi. */
  let surildi = false;
  function zona(yon){
    return ()=>{
      if(surildi){ surildi = false; return; }
      if(ikki){ clearTimeout(ikki); ikki = null; stvLike(true); return; }
      ikki = setTimeout(()=>{ ikki = null; stvKeyingi(yon); }, 240);
    };
  }
  document.getElementById('stvNext').addEventListener('click', zona(1));
  document.getElementById('stvPrev').addEventListener('click', zona(-1));

  /* ----- Surish: PASTGA — yopish, YONGA — kadr almashtirish -----
     O'Q QULFI: barmoq qaysi tomonga ko'proq surilgan bo'lsa, shu
     yo'nalish tanlanadi va gesture oxirigacha o'zgarmaydi. Aks holda
     biroz qiyshiq surilganda oyna ham yopilib, kadr ham almashardi. */
  let y0 = null, x0 = null, oq = null, dx = 0, toxtadi = false;
  const RAM = ()=> v.querySelector('.stv-ramka');
  const YON_CHEK = 64;          /* shuncha pikseldan keyin kadr almashadi */
  function toxtat(){
    clearTimeout(ST_TIMER);
    ST_QOLDI = Math.max(300, ST_QOLDI - (Date.now() - ST_YURDI));
    const b = v.querySelector('.stv-bars .hozir span');
    if(b) b.style.animationPlayState = 'paused';
    stvVideoni(true);
  }
  function davom(){
    const b = v.querySelector('.stv-bars .hozir span');
    if(b) b.style.animationPlayState = '';
    ST_YURDI = Date.now();
    clearTimeout(ST_TIMER);
    ST_TIMER = setTimeout(()=> stvKeyingi(1), ST_QOLDI);
    stvVideoni(false);
  }
  v.addEventListener('pointerdown', (e)=>{
    y0 = e.clientY; x0 = e.clientX; oq = null; dx = 0;
    surildi = false;
    toxtadi = true; toxtat();
  });
  v.addEventListener('pointermove', (e)=>{
    if(y0 === null) return;
    const dy = e.clientY - y0;
    dx = e.clientX - x0;
    /* O'q hali tanlanmagan bo'lsa — qaysi tomon kuchliroq */
    if(!oq && (Math.abs(dx) > 10 || Math.abs(dy) > 10)){
      oq = Math.abs(dx) > Math.abs(dy) ? 'yon' : 'tik';
      surildi = true;                 /* keyingi `click` o'tkazib yuboriladi */
      if(oq === 'yon'){ const r = RAM(); if(r) r.classList.add('suriladi'); }
    }
    /* V133: yozuvlar kadriga bittaga tenglashtiriladi — storiyalar
       eng ko'p surilsadigan joy, shu sabab farqi sezilarli. */
    if(oq === 'tik'){
      if(dy > 0){
        if(!v._yoz) v._yoz = kadrYozuvchi(v);
        v._yoz.qoy('translate3d(0,' + dy + 'px,0)');
      }
    }else if(oq === 'yon'){
      const r = RAM(); if(!r) return;
      /* Chekkadan tashqarida qarshilik (rubber-band) */
      const k = Math.abs(dx) > 150 ? 0.42 : 1;
      const surish = dx * k;
      const burchak = Math.max(-16, Math.min(16, -surish / 11));
      if(!r._yoz) r._yoz = kadrYozuvchi(r);
      r._yoz.qoy('translate3d(' + surish + 'px,0,0) rotateY('
        + burchak + 'deg) scale(' + (1 - Math.min(0.07, Math.abs(surish) / 2600)) + ')');
    }
  });
  const tugat = (e)=>{
    if(y0 === null) return;
    const dy = (e && e.clientY != null) ? e.clientY - y0 : 0;
    const sonDx = dx;
    const oqEdi = oq;
    y0 = null; x0 = null; oq = null; dx = 0;
    if(v._yoz) v._yoz.tugat();
    const rr = RAM(); if(rr && rr._yoz) rr._yoz.tugat();
    v.style.transform = '';

    if(oqEdi === 'yon'){
      const r = RAM();
      if(Math.abs(sonDx) > YON_CHEK){
        /* Chapga surish = KEYINGI (barmoq yo'nalishiga teskari — xuddi
           haqiqiy ilovadagi kabi: sahifani chapga itarasiz, keyingisi
           keladi) */
        if(r) r.classList.remove('suriladi');
        stvKeyingi(sonDx < 0 ? 1 : -1);
        return;
      }
      /* Yetarli surilmadi — joyiga qaytadi */
      if(r){
        r.classList.remove('suriladi');
        r.classList.add('qaytadi');
        r.style.transform = '';
        setTimeout(()=>{ try{ r.classList.remove('qaytadi'); }catch(e){} }, 280);
      }
      if(toxtadi){ toxtadi = false; davom(); }
      return;
    }

    if(dy > 90){ stvYop(); return; }
    if(toxtadi){ toxtadi = false; davom(); }
  };
  v.addEventListener('pointerup', tugat);
  v.addEventListener('pointercancel', tugat);

  /* Sayt orqa fonga o'tsa — vaqt bekorga yurmasin */
  document.addEventListener('visibilitychange', ()=>{
    if(!v.classList.contains('on')) return;
    if(document.hidden) toxtat(); else davom();
  });

  document.addEventListener('keydown', (e)=>{
    if(!v.classList.contains('on')) return;
    if(e.key === 'Escape') stvYop();
    if(e.key === 'ArrowRight') stvKeyingi(1);
    if(e.key === 'ArrowLeft') stvKeyingi(-1);
  });
})();


/* ==================================================================
   ULASHISH KARTOCHKASI  (V158)
   ------------------------------------------------------------------
   NEGA KERAK. Avval "Ulashish" faqat HAVOLA yuborardi. Havola yaxshi,
   lekin odamlar Telegramda ko'pincha RASM tashlaydi — rasm suhbatda
   darhol ko'rinadi, havola esa bitta qator bo'lib qoladi va ochish
   kerak. Ustiga Instagram "stories" ga umuman havola emas, rasm
   kerak.

   NIMA QILADI. Raqamning chiroyli kartochkasini TELEFONNING O'ZIDA
   chizadi (canvas) va tizim ulashish oynasiga rasm sifatida beradi.
   Server ishtirok etmaydi: na so'rov, na kutish, na xarajat.

   O'LCHAM. 1080x1350 (4:5) — Telegram, Instagram post va stories
   uchun ham mos keladigan eng keng tarqalgan nisbat.

   ESKI YO'L YO'QOLMAYDI. Rasm ulashishni qo'llamaydigan brauzerda
   (yoki mijoz xohlasa) havola ulashish avvalgidek ishlaydi.
   ================================================================== */

/* Shriftlar yuklanganini kutamiz — aks holda canvas zaxira shrift
   bilan chizib yuboradi va raqam boshqacha ko'rinadi. */
async function ulashShriftKut(){
  try{
    if(document.fonts && document.fonts.load){
      await Promise.all([
        document.fonts.load('700 120px "Space Grotesk"'),
        document.fonts.load('700 40px "Plus Jakarta Sans"'),
        document.fonts.load('500 30px "Plus Jakarta Sans"')
      ]);
      await document.fonts.ready;
    }
  }catch(e){}
}

/* Yumaloq burchakli to'rtburchak (eski brauzerlarda roundRect yo'q) */
function ulashQutiChiz(c, x, y, w, h, r){
  if(c.roundRect){ c.beginPath(); c.roundRect(x, y, w, h, r); return; }
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

async function ulashRasmYasa(item){
  await ulashShriftKut();
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');

  /* --- asos: grafit, saytdagi bosh kartochka bilan bir xil --- */
  const fon = c.createLinearGradient(0, 0, W * .35, H);
  fon.addColorStop(0, '#20242E');
  fon.addColorStop(.46, '#171A22');
  fon.addColorStop(1, '#0C0E13');
  c.fillStyle = fon; c.fillRect(0, 0, W, H);

  /* oltin yorug'lik — o'ng yuqori burchakdan */
  const oltin = c.createRadialGradient(W * 1.02, -H * .08, 0, W * 1.02, -H * .08, W * .85);
  oltin.addColorStop(0, 'rgba(233,201,131,.30)');
  oltin.addColorStop(.45, 'rgba(233,201,131,.07)');
  oltin.addColorStop(1, 'rgba(233,201,131,0)');
  c.fillStyle = oltin; c.fillRect(0, 0, W, H);

  /* ko'k yorug'lik — chap pastdan */
  const kok = c.createRadialGradient(-W * .1, H * 1.1, 0, -W * .1, H * 1.1, W);
  kok.addColorStop(0, 'rgba(61,109,255,.16)');
  kok.addColorStop(1, 'rgba(61,109,255,0)');
  c.fillStyle = kok; c.fillRect(0, 0, W, H);

  /* --- brend --- */
  const vip = !!tierOf(item);
  c.fillStyle = vip ? '#D9B45F' : '#3D6DFF';
  ulashQutiChiz(c, 84, 92, 86, 86, 24); c.fill();
  c.fillStyle = vip ? '#1A1407' : '#FFFFFF';
  c.font = '800 34px "Plus Jakarta Sans", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('VR', 127, 137);

  c.textAlign = 'left';
  c.fillStyle = '#F5F7FA';
  c.font = '700 34px "Plus Jakarta Sans", sans-serif';
  c.fillText('VIP RAQAMLAR', 192, 122);
  c.fillStyle = 'rgba(214,222,234,.6)';
  c.font = '500 25px "Plus Jakarta Sans", sans-serif';
  c.fillText(LANG === 'ru' ? 'Красивые номера' : 'Chiroyli raqamlar', 192, 160);

  /* --- VIP yoki operator yorlig'i --- */
  let yorliqY = 384;
  const yorliq = (matn, fonRang, matnRang) => {
    c.font = '700 27px "Plus Jakarta Sans", sans-serif';
    const en = c.measureText(matn).width + 56;
    c.fillStyle = fonRang;
    ulashQutiChiz(c, 84, yorliqY - 26, en, 56, 28); c.fill();
    c.fillStyle = matnRang;
    c.textBaseline = 'middle';
    c.fillText(matn, 84 + 28, yorliqY + 2);
    return en;
  };
  if(vip){
    const en = yorliq((TIERS[tierOf(item)] || 'VIP').toUpperCase(), 'rgba(217,180,95,.18)', '#E7C87E');
    const eski = yorliqY;
    c.font = '700 27px "Plus Jakarta Sans", sans-serif';
    const op = String(item.operator || '');
    if(op){
      const en2 = c.measureText(op).width + 56;
      c.fillStyle = 'rgba(255,255,255,.08)';
      ulashQutiChiz(c, 84 + en + 14, eski - 26, en2, 56, 28); c.fill();
      c.fillStyle = '#C6CDD9';
      c.fillText(op, 84 + en + 14 + 28, eski + 2);
    }
  }else{
    yorliq(String(item.operator || ''), 'rgba(255,255,255,.08)', '#C6CDD9');
  }

  /* --- RAQAM: kartochkaning qahramoni --- */
  const raqam = shortNumber(item.number);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  c.fillStyle = '#FFFFFF';
  /* Eniga sig'maguncha kichraytiramiz */
  let olcham = 118;
  do{
    c.font = '700 ' + olcham + 'px "Space Grotesk", "Plus Jakarta Sans", monospace';
    if(c.measureText(raqam).width <= W - 168) break;
    olcham -= 4;
  }while(olcham > 56);
  c.fillText(raqam, 84, 690);

  /* ingichka ajratgich */
  c.fillStyle = 'rgba(255,255,255,.12)';
  c.fillRect(84, 772, W - 168, 1.5);

  /* --- narx --- */
  const kn = kartaNarx(item);
  c.fillStyle = 'rgba(214,222,234,.55)';
  c.font = '600 27px "Plus Jakarta Sans", sans-serif';
  c.fillText(LANG === 'ru' ? 'Цена' : 'Narxi', 84, 856);
  c.fillStyle = '#FFFFFF';
  c.font = '700 62px "Space Grotesk", "Plus Jakarta Sans", monospace';
  /* DIQQAT: UNITH() HTML qaytaradi (<small>so'm</small>) — canvas
     teglarni tushunmaydi va ularni HARF sifatida chizib yuboradi.
     Shuning uchun bu yerda oddiy matn ishlatiladi. */
  const birlik = isUsd(item) ? '$' : SUM();
  const narxMatn = kn.bolib ? String(kn.ins || '')
    : (isUsd(item) ? (birlik + ' ' + formatPrice(item.price))
                   : (formatPrice(item.price) + ' ' + birlik));
  c.fillText(narxMatn, 84, 936);

  /* bo'lib to'lash qatori (agar bor bo'lsa va narx naqd ko'rsatilgan bo'lsa) */
  if(!kn.bolib && kn.ins){
    c.fillStyle = '#35D68F';
    c.font = '600 29px "Plus Jakarta Sans", sans-serif';
    c.fillText(String(kn.ins), 84, 998);
  }

  /* --- pastki qator: sayt manzili --- */
  c.fillStyle = 'rgba(255,255,255,.08)';
  ulashQutiChiz(c, 84, H - 196, W - 168, 108, 26); c.fill();
  c.fillStyle = '#F5F7FA';
  c.font = '700 32px "Plus Jakarta Sans", sans-serif';
  c.textBaseline = 'middle';
  c.fillText('vipraqamlar.uz', 128, H - 142);
  c.fillStyle = 'rgba(214,222,234,.6)';
  c.font = '500 26px "Plus Jakarta Sans", sans-serif';
  c.textAlign = 'right';
  c.fillText(LANG === 'ru' ? 'Все номера на сайте' : 'Barcha raqamlar saytda', W - 128, H - 142);

  return new Promise((ok)=> cv.toBlob(b => ok({ blob: b, dataUrl: b ? null : cv.toDataURL('image/png') }), 'image/png', .92));
}

/* Rasmni tizim ulashish oynasiga beradi; qo'llab-quvvatlanmasa —
   yuklab oladi. Ikkala holatda ham mijoz nima bo'lganini ko'radi. */
async function ulashRasm(item){
  try{
    const r = await ulashRasmYasa(item);
    if(!r || !r.blob) throw new Error('rasm yasalmadi');
    const nom = 'vipraqamlar-' + String(item.number || '').replace(/\D/g, '') + '.png';
    const fayl = new File([r.blob], nom, { type: 'image/png' });

    if(navigator.canShare && navigator.canShare({ files: [fayl] }) && navigator.share){
      await navigator.share({
        files: [fayl],
        title: 'VIP RAQAMLAR',
        text: shortNumber(item.number) + ' — ' + formatPriceUzs(item.price)
      });
      return true;
    }
    /* Zaxira yo'l: yuklab olish */
    const url = URL.createObjectURL(r.blob);
    const a = document.createElement('a');
    a.href = url; a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 4000);
    toast(LANG === 'ru' ? 'Картинка сохранена' : 'Rasm yuklab olindi');
    return true;
  }catch(e){
    /* Mijoz ulashishni bekor qilsa — bu xato emas, jim o'tamiz */
    if(e && (e.name === 'AbortError' || /abort/i.test(String(e.message)))) return false;
    console.error('Ulashish rasmi:', e);
    toast(LANG === 'ru' ? 'Не удалось создать картинку' : "Rasm yasab bo'lmadi");
    return false;
  }
}
