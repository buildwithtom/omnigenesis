// Historical state follows chapter position. Ambient phase moves gas and rotates materials.
// Coordinates within the artwork use viewport height as one unit.
const vec3 csBlack = vec3(.019, .020, .024);
const vec3 csAmber = vec3(.97, .57, .225);
const vec3 csIvory = vec3(1., .943, .806);

mat2 csRotate(float a) {
    float s = sin(a), c = cos(a);
    return mat2(c, s, -s, c);
}

float csHash(vec2 p) {
    vec3 q = fract(p.xyx * vec3(.1031, .1030, .0973));
    q += dot(q, q.yzx + 33.33);
    return fract((q.x + q.y) * q.z);
}

float csNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.-2.*f);
    return mix(mix(csHash(i), csHash(i + vec2(1,0)), f.x),
               mix(csHash(i + vec2(0,1)), csHash(i + vec2(1,1)), f.x), f.y);
}

// Rotating the sample axes at every octave avoids an axis-aligned grain.
float csCloud(vec2 p, float detail) {
    mat2 octave = mat2(1.65, 1.19, -1.19, 1.65);
    float n = .54 * csNoise(p);
    p = octave*p + 17.6;
    n += .27 * csNoise(p);
    p = octave*p + 17.6;
    n += .135 * csNoise(p);
    if (detail > .5) {
        p = octave*p + 17.6;
        n += .0675 * csNoise(p);
    } else {
        n += .03375;
    }
    return n;
}

// Each grid cell can contain one source. Its light fits inside the cell.
vec3 csStars(vec2 p, float scale, float threshold, float seed) {
    // Two depth layers drift at different angular speeds.
    vec2 drift = vec2(sin(ambient*.065 + seed)-sin(seed), sin(ambient*.045))*.015;
    vec2 grid = (p + drift)*scale + seed;
    vec2 id = floor(grid);
    float lum = csHash(id + 91.5);
    if (lum < threshold) return vec3(0);
    vec2 offset = .17 + .66*vec2(csHash(id), csHash(id+37.));
    float r = length(fract(grid) - offset);
    float intensity = (lum-threshold) / (1.-threshold);
    float dotLight = exp(-r*r*mix(1500., 150., intensity*intensity));
    vec3 tint = mix(vec3(.65,.73,.86), vec3(1.,.86,.65), csHash(id+8.2));
    return tint * dotLight * (.12+.66*intensity);
}

vec3 csIgnition(vec2 p, float strength, float size) {
    p /= size;
    float r = length(p);
    float core = exp(-r*r*21000.);
    float glint = exp(-abs(p.y)*1900.)*exp(-abs(p.x)*22.)
                + exp(-abs(p.x)*2200.)*exp(-abs(p.y)*45.);
    return strength*(csIvory*core + vec3(1.,.78,.49)*.50*glint
          + vec3(.98,.52,.18)*.82*exp(-r*60.)
          + vec3(.48,.223,.072)*.54*exp(-r*9.));
}

vec3 csInflation(vec2 p, float t, float q) {
    // The coordinate lattice stretches uniformly throughout the field.
    vec2 s = csRotate(-.24)*p * exp(-1.65*t);
    float warp = csCloud(s*2.2 + vec2(.38*t+.11*sin(ambient*.18), 4.1+.08*sin(ambient*.12)), q);
    float striation = csCloud(vec2(s.x*2., s.y*15. + 4.*warp), q);
    float sheet = s.y + .63*(warp-.53) + .058*(striation-.5);
    float filament = .036 / (.037 + abs(sheet));
    float inner = exp(-abs(sheet)*83.);
    float folds = abs(sin((sheet+.012*striation)*140.));
    float strands = exp(-folds*6.) * exp(-abs(sheet)*10.);
    vec3 mist = mix(vec3(.20,.135,.081), vec3(.64,.435,.231), striation);
    return csBlack + mist*filament*(.33+.66*striation)
         + csIvory*inner*(.24+.49*striation)
         + vec3(.49,.36,.21)*strands*(.22+.47*striation);
}

vec3 csPlasma(vec2 p, float t, float q) {
    vec2 v = csRotate(.42)*p * (3.7-.6*t) + vec2(.18*t+.14*sin(ambient*.21), 23.+.11*sin(ambient*.15));
    vec2 flow = vec2(csCloud(v+.28*t,q), csCloud(v-vec2(14.,.25*t),q));
    float heat = csCloud(v*1.4 + 2.7*flow,q);
    float eddy = csCloud(v*3. + 5.2*flow - t*.22,q);
    float vein = exp(-abs(heat-.54)*25.)*(.35+.65*eddy);
    float density = smoothstep(.27,.77,heat)*(.4+.6*eddy);
    vec3 col = mix(vec3(.042,.025,.036),vec3(.43,.145,.049),density);
    col += vec3(.83,.46,.185)*vein + vec3(.53,.42,.28)*pow(vein,4.);
    return col;
}

vec3 csNuclei(vec2 p, float t, float q) {
    vec2 a = csRotate(.27)*p;
    float fog = csCloud(a*5.+3.,q);
    vec3 col = csBlack + vec3(.125,.057,.031)*fog*fog;
    for (int layer=0; layer<2; layer++) {
        float z = float(layer);
        vec2 g = a*(3.5+z*10.) + vec2(1.3,3.) + z*.6 + .07*vec2(sin(ambient*.18+z),sin(ambient*.13));
        vec2 id = floor(g);
        vec2 center = .28+.44*vec2(csHash(id+vec2(27.,0.)), csHash(id+13.));
        vec2 d = fract(g)-center;
        float seed = csHash(id+29.);
        if (seed>.24+.28*z) {
            vec2 axis = vec2(cos(seed*28.+ambient*.13),sin(seed*28.+ambient*.13));
            float gap = (.112-.058*t)*(1.-.48*z);
            float r1 = length(d - axis*gap);
            float r2 = length(d + axis*gap);
            float r3 = length(d + vec2(-axis.y, axis.x)*.85*gap);
            float spread = 1.+.48*z;
            float a1 = exp(-r1*r1*620.*spread);
            float a2 = exp(-r2*r2*750.*spread)*smoothstep(.27,.61,seed);
            float a3 = exp(-r3*r3*830.*spread)*smoothstep(.62,.80,seed);
            vec3 nucleus = csIvory*a1 + csAmber*a2 + vec3(.68,.77,.82)*a3;
            col += (nucleus*.74 + vec3(.52,.23,.085)*exp(-length(d)*9.)*.28)
                   * (1.-.57*z);
        }
    }
    return col;
}

// A section through the last-scattering medium. Thin, nearly edge-on folds
// carry more light along the line of sight. The field has no point source.
vec3 csScatteringVeil(vec2 s, float layer, float clear, float q) {
    float phase = layer*1.37 + .13*sin(ambient*.13 + layer);
    float sweep = .12*sin(s.x*2.35 + phase) + .042*sin(s.x*5.1 - phase);
    float folds = csCloud(vec2(s.x*1.7 + phase, s.y*2.2 + phase*3.),q);
    float height = s.y - sweep - (layer-.9)*(.026+.092*clear) - .092*(folds-.5);
    float width = .068 + .033*sin(2.1*s.x+phase) + .024*(1.-clear);
    float depth = height / width;
    float texture = csCloud(vec2(s.x*4.2 + phase, depth*1.8 + folds*2.),q);
    float body = exp(-depth*depth*1.45);
    float lip = exp(-abs(depth)*5.8);
    float filament = .5+.5*cos(depth*27.+6.*texture+1.3*sin(s.x*5.+phase));
    float gathering = .25+.75*exp(-2.72*(s.x-.09+.13*layer)*(s.x-.09+.13*layer));
    vec3 silk = mix(vec3(.20,.22,.27),vec3(.57,.36,.19),texture);
    return gathering * (silk*body*(.38+.53*texture)
         + vec3(.82,.63,.39)*lip*(.36+.70*texture)
         + vec3(.41,.36,.29)*body*filament*filament*.13);
}

vec3 csLastScattering(vec2 p, float t, float q) {
    float clear = smoothstep(.02,.95,t);
    vec2 s = csRotate(.28)*p;
    s.x += .14*t;
    s.y += .023*sin(ambient*.14);
    float patch = csCloud(p*3.2+vec2(13.,9.),q);
    float mist = csCloud(vec2(s.x*2.2,s.y*6.8)+patch*1.7,q);
    vec3 col = mix(vec3(.023,.031,.045),vec3(.095,.082,.073),patch);
    // Diffuse light gives way to paths that cross the cleared material.
    col += vec3(.40,.27,.18)*(.34+mist)*exp(-abs(s.y)*3.5)*(1.-clear);
    for(int i=0;i<3;i++) col += csScatteringVeil(s,float(i),clear,q)*(.7-.29*clear);
    vec2 ray = csRotate(-.10)*s;
    float lanes = csNoise(vec2(ray.y*62.+.20*sin(ambient*.16), 8.));
    float shafts = pow(lanes,5.)*exp(-abs(ray.y+.015)*7.)*exp(-abs(ray.x-.23)*1.4);
    col += vec3(.62,.52,.34)*shafts*clear;
    return 1.-exp(-1.17*col);
}

float csGas(vec2 p, float t, float q) {
    vec2 s = csRotate(-.46)*p;
    s += vec2(.065*sin(ambient*.16),.045*sin(ambient*.13 + p.x*2.));
    float coarse = csCloud(s*3.2+vec2(6.,.04*t),q);
    float fine = csCloud(vec2(s.x*6.,s.y*11.)+vec2(3.*coarse,4.),q);
    float axis = s.y + .56*(coarse-.49);
    return exp(-abs(axis)*6.) * smoothstep(.23,.77,fine);
}

vec3 csDark(vec2 p, float t, float q) {
    float cloud = csGas(p, t, q);
    return csBlack*.72 + vec3(.089,.092,.105)*cloud*(.52+.4*t);
}

vec3 csDawn(vec2 p, float t, float q) {
    vec2 s = p*(1.08-.22*t);
    float gas = csGas(s,t,q);
    float light = smoothstep(.06,.62,t);
    float r = length(s);
    vec3 col = csBlack + vec3(.23,.17,.14)*gas;
    col += vec3(.62,.37,.18)*gas*light*exp(-r*4.6);
    col += csIgnition(s, (.09+.96*light)*(1.+.09*sin(ambient*.48)), .83+.68*t);
    if (t>.30) col += csStars(s,47.,.92,3.)*smoothstep(.30,.94,t);
    if (q>.5) col += csStars(s,96.,.95,7.)*.48*light;
    return col;
}

// A galaxy comprises an asymmetric stellar envelope, irregular knots and
// (later) a thin stellar disk. Individual systems have different inclinations.
vec3 csGalaxy(vec2 p, float seed, float spiral, float q) {
    float r = length(p);
    if (r>1.8) return vec3(0);
    p = csRotate(.034*ambient)*p;
    float a = atan(p.y,p.x+.00001);
    float n = csCloud(p*5.2+seed,q);
    float knots = csCloud(p*14.+seed+2.6*n,q);
    float phase = 2.*a + 9.*sqrt(r+.025) + 3.*(n-.5) + seed;
    float arms = pow(.50+.50*cos(phase),3.2);
    float sides = .67 + .33*cos(a+seed);
    float envelope = exp(-2.9*r) * (1.-smoothstep(1.28,1.8,r));
    float stars = csNoise(p*237.+seed);
    float texture = .73+.43*stars;
    float body = envelope*sides*(.23+1.8*smoothstep(.38,.74,n));
    float lanes = mix(.65+.43*knots, .28+.96*arms, spiral);
    vec3 col = mix(vec3(.38,.45,.57),vec3(.80,.69,.55),knots)*body*lanes;
    col += vec3(.72,.53,.36)*exp(-r*10.)*mix(.29,1.15,spiral);
    col += vec3(.87,.84,.81)*envelope*pow(smoothstep(.48,.77,knots),3.)*.56;
    return col*texture;
}

vec3 csGalaxies(vec2 p, float t, float q) {
    vec2 s = p*(.85+1.55*t);
    vec3 col = csBlack + csStars(s,45.,.9,12.)*.57;
    if(q>.5) col += csStars(s,110.,.91,18.)*.35;
    vec2 hero = csRotate(-.36-.13*t)*s;
    col += 1.32*csGalaxy(hero*vec2(2.05,3.4+3.6*t),23.7,smoothstep(.15,.83,t),q);
    col += csGalaxy((csRotate(.74)*(s-vec2(-.68,.3)))*vec2(8.,16.),
                    8.7, .27+.27*t,q)*.76;
    col += csGalaxy((csRotate(-.89)*(s-vec2(.71,-.26)))*vec2(6.5,9.7),
                    7.1,.12,q)*.83;
    return col;
}

// The distance between the nearest two seeded sites defines a filament.
// Cropping each cell to a bounded neighbourhood keeps the cost independent
// of zoom and leaves the interiors of the cosmic voids dark.
vec2 csWebDistances(vec2 p) {
    vec2 cell = floor(p), f = fract(p);
    float first = 9., second = 9.;
    for(int y=-1;y<=1;y++) {
        for(int x=-1;x<=1;x++) {
            vec2 off = vec2(float(x),float(y));
            vec2 id = cell+off;
            vec2 site = off+.17+.66*vec2(csHash(id+4.),csHash(id+8.));
            vec2 d = site-f;
            float dist = dot(d,d);
            second = min(second,max(first,dist));
            first = min(first,dist);
        }
    }
    return vec2(sqrt(first),sqrt(second));
}

vec3 csStructure(vec2 p, float t, float q) {
    float zoom = 2.7+4.8*sin(t*2.31);
    vec2 s = csRotate(.1)*p*zoom+vec2(.39+.08*sin(ambient*.12),4.02+.06*sin(ambient*.1));
    vec2 warp = vec2(csCloud(s*.63,q),csCloud(s*.71+9.,q))-.5;
    vec2 dist = csWebDistances(s+warp*1.8);
    float edge = dist.y-dist.x;
    float variation = csCloud(s*4.2,q);
    float thread = exp(-edge*49.);
    float halo = exp(-edge*10.);
    float nodes = smoothstep(.58,.89,dist.x)*halo;
    float dust = csNoise(s*68.);
    float clumping = smoothstep(.28,.71,variation);
    float knots = pow(dust,3.)*halo*clumping;
    vec3 col = csBlack + vec3(.29,.39,.48)*thread*(.12+.94*clumping)*(.4+.7*dust)
            + vec3(.25,.33,.42)*halo*clumping + csIvory*nodes*(.12+.67*clumping)
            + vec3(.75,.66,.53)*knots;
    col += csStars(s,13.4,.73,6.)*(.15+.88*halo);
    float nursery = smoothstep(.63,1.,t);
    if(nursery>0.) {
        float gas = csGas(p,t,q);
        col = mix(col, csBlack + vec3(.63,.29,.16)*gas
                        + csStars(p,66.,.88,4.)*.74 + csIgnition(p,.55,.44),nursery);
    }
    return col;
}

// The final arm crossing and the first view of the solar nebula share this
// focal cloud, so neither its position nor its light jumps at the boundary.
vec3 csSolarCloud(vec2 p, float q) {
    float gas = csGas(p*.83,.55,q);
    float wisps = csCloud(p*vec2(5.1,8.3)+vec2(5.6,.11*sin(ambient*.12)),q);
    vec3 col = csBlack + vec3(.37,.23,.16)*gas*(.50+.85*wisps);
    col += csStars(p,81.,.64,35.)*(.26+.65*gas);
    return col + csIgnition(p,.27,.47)*(.55+gas);
}

vec3 csMilkyWay(vec2 p, float t, float q) {
    float flight = smoothstep(.26,.95,t);
    float zoom = exp(3.85*flight);
    vec2 g = csRotate(-.33)*p*vec2(1.7,2.35)/zoom;
    // Aim off-centre and move inward until a patch of an arm fills the view.
    g = csRotate(.12+.010*ambient)*g;
    // Fix the destination in the rotating disk, on the crest of a major arm.
    const float armAngle = .977;
    g += .57*vec2(cos(armAngle),sin(armAngle))*flight;
    float r = length(g);
    float angle = atan(g.y,g.x+.00001);
    float clouds = csCloud(g*5.8+2.1,q);
    float phase = angle - 3.2*log(max(r,.115)/.42) + .39*(clouds-.5);
    float envelope = exp(-1.85*r)*(1.-smoothstep(.92,1.46,r));
    float ring = smoothstep(.09,.26,r);
    float major = pow(.5+.5*cos(2.*phase),5.);
    float branch = pow(.5+.5*cos(4.*phase+.85+.72*sin(3.*angle)),8.);
    float arms = ring*(major+.32*branch);
    float knots = csCloud(g*20.+3.1*clouds,q);
    float split = pow(.5+.5*cos(2.*phase+.42),15.);
    float clear = 1.-.68*split*ring*smoothstep(.33,.63,knots);
    float bar = exp(-length(g*vec2(3.8,12.5))*1.8);
    vec3 col = csBlack + csStars(p,61.,.83,44.)*.35;
    col += vec3(.94,.69,.41)*(1.25*bar+.52*exp(-r*7.));
    col += envelope*(vec3(.20,.17,.15)+arms*vec3(.83,.89,1.08))*(.28+1.20*knots)*clear;
    col += vec3(.79,.38,.31)*arms*envelope*pow(smoothstep(.47,.75,knots),4.);
    // Separate star scales form unresolved light, fine grains and bright members.
    vec3 grains = csStars(g,157.,.14,16.) + .85*csStars(g,72.,.44,29.);
    if(q>.5) grains += .72*csStars(g,277.,.17,58.);
    col += grains*envelope*(.57+5.*arms)*(.43+1.16*knots);
    float nearby = smoothstep(.46,.92,t);
    col += nearby*csStars(p/exp(.60*flight),55.,.72,74.)*.85;
    if(t>.70) col = mix(col,csSolarCloud(p,q),smoothstep(.70,.99,t));
    return col;
}

// Young bodies in an inclined disk. Their sizes and separations are compressed.
vec3 csYoungPlanets(vec3 col, vec2 p, float t) {
    float formed = smoothstep(.24,.63,t);
    if(formed<=0.) return col;
    vec2 screen = csRotate(-.27)*p;
    for(int i=0;i<6;i++) {
        float k = float(i);
        float orbit = .092+k*.093;
        float angle = 1.17+k*2.43 + (.27*t+ambient*.026)/(orbit+.19);
        vec2 centre = vec2(cos(angle),.34*sin(angle))*orbit;
        float radius = (.006+.002*k+.011*exp(-abs(k-3.)*2.))*formed;
        vec2 d = (screen-centre)/max(radius,.00001);
        float dd = dot(d,d);
        // Faint, incomplete tracks pick out the developing disk plane.
        float track = abs(length(screen*vec2(1.,1./.34))-orbit);
        col += vec3(.21,.18,.14)*exp(-track*650.)*formed*(.5+.5*cos(angle+screen.x*7.));
        if(dd<1.) {
            vec3 normal = vec3(d,sqrt(1.-dd));
            vec3 sunlight = normalize(vec3(-centre,.05));
            float lit = max(0.,dot(normal,sunlight));
            float surface = csNoise(d*4.+k);
            vec3 rock = mix(vec3(.47,.31,.22),vec3(.75,.63,.45),surface);
            vec3 bands = vec3(.70,.58,.43)*(.87+.13*sin(d.y*17.+surface));
            vec3 material = mix(rock,bands,smoothstep(2.,3.,k));
            vec3 body = material*(.067+.93*lit) + .09*pow(1.-normal.z,2.)*csAmber;
            col = mix(col,body,smoothstep(0.,.16,1.-dd)*formed);
        }
    }
    return col;
}

vec3 csDisk(vec2 p, float t, float q) {
    vec2 s = csRotate(-.27)*p*(1.04-.14*t);
    vec2 plane = s*vec2(1.,3.45);
    float r = length(plane);
    float a = atan(plane.y,plane.x+.00001);
    // Passing disk coordinates through a rotation makes material orbit
    // smoothly, including at the angular seam.
    vec2 flow = csRotate(.37*t + ambient*.07/(1.+r) - 2.9*r)*plane;
    float broad = csCloud(flow*5.4+4.,q);
    float grit = csCloud(flow*vec2(48.,52.)+2.*broad,q);
    float band = .5+.5*cos(104.*r + 2.3*broad + 1.7*sin(2.*a-6.*r));
    float envelope = exp(-r*2.9) * (1.-smoothstep(.69,1.13,r));
    float gap = smoothstep(.038,.098,r);
    float dust = envelope*gap*(.36+.42*band+.56*grit)*(.50+.55*broad);
    vec3 col = csBlack + csStars(p,57.,.92,17.)*.38;
    col += vec3(.92,.62,.35)*dust*(1.-.67*smoothstep(.24,.85,t));
    col += vec3(.50,.19,.07)*exp(-abs(s.y)*9.)*exp(-abs(s.x)*3.)*broad*.36;
    col += csIgnition(p,.68+.30*t,.92);
    if(t>.28) {
        col += csStars(flow,52.,.68,7.)*envelope*gap*.85*smoothstep(.28,.84,t);
    }
    col = csYoungPlanets(col,p,t);
    if(t<.33) col = mix(csSolarCloud(p,q),col,smoothstep(0.,.33,t));
    return col;
}

float csRock(vec3 n, float k) {
    // Continuous triplanar sampling keeps the crust attached to the sphere.
    vec3 weights = pow(abs(n),vec3(3.));
    weights /= max(.001,weights.x+weights.y+weights.z);
    return weights.x*csNoise(n.yz*k+7.)
         + weights.y*csNoise(n.zx*k+13.)
         + weights.z*csNoise(n.xy*k+21.);
}

vec3 csEarth(vec2 p, float t, float q) {
    float radius = .207 + .147*smoothstep(0.,1.,t);
    vec2 disk = p/radius;
    float d = length(disk);
    vec3 lightDirection = normalize(vec3(-.78,.47,.37));
    vec3 col = csBlack + csStars(p,57.,.90,13.)*.45;
    float limbLight = .16+.84*max(0.,dot(disk/max(d,.001),lightDirection.xy));
    if(d>1.) {
        float h = d-1.;
        col += vec3(.57,.27,.11)*exp(-h*67.)*limbLight
             + vec3(.22,.092,.041)*exp(-h*10.)*limbLight;
        return col;
    }
    vec3 normal = vec3(disk,sqrt(max(0.,1.-d*d)));
    vec3 surface = normal;
    surface.xz = csRotate(.85 + t*.60 + ambient*.065)*surface.xz;
    float plates = csRock(surface,3.8);
    vec3 wrinkle = normalize(surface + vec3(.11*plates,.10*csRock(surface,7.),.13*plates));
    float cracks = csRock(wrinkle,9.5);
    float grain = csRock(wrinkle,33.);
    float gravel = q>.5 ? csRock(wrinkle,109.) : grain;
    float boundaries = abs(cracks-.49+.14*(grain-.5));
    float fissure = exp(-boundaries*80.)*smoothstep(.38,.67,plates);
    float lava = smoothstep(.56,.75,plates+.19*(grain-.5));
    float diffuse = max(0., dot(normal,lightDirection));
    float rim = pow(1.-normal.z,3.);
    float hemispheric = .035 + .90*pow(diffuse,.72);
    vec3 crust = mix(vec3(.115,.098,.094), vec3(.51,.341,.213),
                     clamp(.55*plates+.31*grain+.22*gravel,0.,1.));
    col = crust*hemispheric*(.71+.77*gravel);
    col += vec3(.84,.24,.046)*lava*(.60+.45*grain)
         + vec3(.985,.51,.13)*fissure*(.55+.40*gravel)
         + vec3(.80,.51,.28)*rim*limbLight;
    return col;
}

vec3 cosmos(int scene, vec2 uv, vec2 focus, float aspect, float local, float detail) {
    vec2 p = (uv-focus)*vec2(aspect,1.);
    if (scene >= 6) p *= max(1., .82/aspect);
    float t = clamp(local,0.,1.);
    if(scene==1) return csInflation(p,t,detail);
    if(scene==2) return csPlasma(p,t,detail);
    if(scene==3) return csNuclei(p,t,detail);
    if(scene==4) return csLastScattering(p,t,detail);
    if(scene==5) return csDark(p,t,detail);
    if(scene==6) return csDawn(p,t,detail);
    if(scene==7) return csGalaxies(p,t,detail);
    if(scene==8) return csStructure(p,t,detail);
    if(scene==11) return csMilkyWay(p,t,detail);
    if(scene==9) return csDisk(p,t,detail);
    if(scene==10) return csEarth(p,t,detail);
    return csBlack;
}
