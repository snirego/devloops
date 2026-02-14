import { Head, Html, Main, NextScript } from "next/document";

/**
 * Inline script that reads the cached brand color from localStorage and
 * applies the full palette as CSS custom properties on <html> BEFORE the
 * browser paints anything.  This eliminates the "flash of default indigo"
 * that would otherwise appear while React hydrates and the workspace
 * provider fetches the real color from the DB.
 *
 * The palette generation logic here mirrors generateBrandPalette() in
 * ~/utils/brandColors.ts — keep them in sync if the algorithm changes.
 */
const BRAND_COLOR_INIT_SCRIPT = `(function(){
try{
  var c=localStorage.getItem("brandColor");
  if(!c||!/^#[0-9a-fA-F]{6}$/.test(c))return;

  function h2r(h){
    var x=h.replace("#","");
    return[parseInt(x.substring(0,2),16),parseInt(x.substring(2,4),16),parseInt(x.substring(4,6),16)];
  }
  function mix(r,g,b,a){
    return[Math.round(255+(r-255)*a),Math.round(255+(g-255)*a),Math.round(255+(b-255)*a)];
  }
  function r2h(r,g,b){
    var mx=Math.max(r,g,b)/255,mn=Math.min(r,g,b)/255,l=(mx+mn)/2,s=0,h=0;
    if(mx!==mn){
      var d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);
      var rv=r/255,gv=g/255,bv=b/255;
      if(mx===rv/255)h=((gv-bv)/(d*255)+(gv<bv?6:0))/6;
      else if(mx===gv/255)h=((bv-rv)/(d*255)+2)/6;
      else h=((rv-gv)/(d*255)+4)/6;
    }
    return[h*360,s*100,l*100];
  }
  function hsl2rgb(h,s,l){
    var sn=s/100,ln=l/100,a=sn*Math.min(ln,1-ln);
    function f(n){var k=(n+h/30)%12;return Math.round(255*Math.max(0,Math.min(1,ln-a*Math.max(Math.min(k-3,9-k,1),-1))));}
    return[f(0),f(8),f(4)];
  }

  var rgb=h2r(c),R=rgb[0],G=rgb[1],B=rgb[2];
  var mx=Math.max(R,G,B)/255,mn=Math.min(R,G,B)/255,L=(mx+mn)/2*100;
  var S=0;
  if(mx!==mn){var dd=mx-mn;S=(L/100>.5?dd/(2-mx-mn):dd/(mx+mn))*100;}
  var H=0;
  if(mx!==mn){
    var rv=R/255,gv=G/255,bv=B/255,d2=mx-mn;
    if(mx===rv)H=((gv-bv)/d2+(gv<bv?6:0))/6;
    else if(mx===gv)H=((bv-rv)/d2+2)/6;
    else H=((rv-gv)/d2+4)/6;
    H*=360;
  }

  var p={};
  var m=[[50,.05],[100,.1],[200,.2],[300,.4],[400,.7]];
  for(var i=0;i<m.length;i++){var w=m[i],v=mix(R,G,B,w[1]);p[w[0]]=v[0]+" "+v[1]+" "+v[2];}
  p[500]=R+" "+G+" "+B;
  var dk=[[600,5,8],[700,8,16],[800,10,24],[900,10,32],[950,10,40]];
  for(var j=0;j<dk.length;j++){
    var d=dk[j],ns=Math.min(100,S+d[1]),nl=Math.max(5,L-d[2]),v2=hsl2rgb(H,ns,nl);
    p[d[0]]=v2[0]+" "+v2[1]+" "+v2[2];
  }
  var root=document.documentElement;
  for(var k in p)if(p.hasOwnProperty(k))root.style.setProperty("--brand-"+k,p[k]);
  root.style.setProperty("--brand",R+" "+G+" "+B);
}catch(e){}
})()`;

export default function Document() {
  return (
    <Html>
      <Head>
        {/* Blocking script: apply cached brand color BEFORE any CSS paints.
            Must be in <Head> so it runs before stylesheets are evaluated. */}
        <script dangerouslySetInnerHTML={{ __html: BRAND_COLOR_INIT_SCRIPT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
