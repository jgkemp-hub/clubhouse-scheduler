<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta http-equiv="Content-Style-Type" content="text/css">
  <title></title>
  <meta name="Generator" content="Cocoa HTML Writer">
  <meta name="CocoaVersion" content="2685.5">
  <style type="text/css">
    p.p1 {margin: 0.0px 0.0px 0.0px 0.0px; font: 14.7px Arial; color: #181818; -webkit-text-stroke: #181818}
    p.p2 {margin: 0.0px 0.0px 0.0px 0.0px; font: 14.7px Arial; color: #181818; -webkit-text-stroke: #181818; min-height: 16.0px}
    span.s1 {font-kerning: none}
  </style>
</head>
<body>
<p class="p1"><span class="s1">const CACHE_NAME = 'bar-scheduler-v1';</span></p>
<p class="p1"><span class="s1">const urlsToCache = ['/', '/index.html'];</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">self.addEventListener('install', event =&gt; {</span></p>
<p class="p1"><span class="s1">  event.waitUntil(caches.open(CACHE_NAME).then(cache =&gt; cache.addAll(urlsToCache)));</span></p>
<p class="p1"><span class="s1">});</span></p>
<p class="p2"><span class="s1"></span><br></p>
<p class="p1"><span class="s1">self.addEventListener('fetch', event =&gt; {</span></p>
<p class="p1"><span class="s1">  event.respondWith(caches.match(event.request).then(response =&gt; response || fetch(event.request)));</span></p>
<p class="p1"><span class="s1">});</span></p>
</body>
</html>
