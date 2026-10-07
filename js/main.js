'use strict';
/* ---------- boot ---------- */
buildOutlines(); watchLayout(); showProgress();
const wanted = (location.hash || '').slice(1);
go(VIEWS.indexOf(wanted) >= 0 ? wanted : store.get('view', 'start'), true);
