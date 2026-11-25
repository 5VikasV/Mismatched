"""ScrapLoop's original miniature material-exchange sculpture.
Rebuild: blender --background --python design/blender/material_loop.py
"""
import bpy, math, os
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'dist/assets/3d'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene
scene.frame_start=1; scene.frame_end=241; scene.render.fps=30

def mat(name,color,metal=0,rough=.4,emission=0):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Metallic'].default_value=metal;bs.inputs['Roughness'].default_value=rough
    if emission:bs.inputs['Emission Color'].default_value=(*color,1);bs.inputs['Emission Strength'].default_value=emission
    return m
ink=mat('Midnight powder-coated steel',(.045,.09,.095),.4)
slate=mat('Graphite conveyor',(.10,.16,.17),.5)
cream=mat('Porcelain factory cladding',(.79,.81,.69),.15)
mint=mat('Reprocessed sea-glass polymer',(.20,.65,.47),.25)
lime=mat('Loop signal',(.72,.94,.18),.25,emission=.2)
copper=mat('Recovered copper',(.66,.25,.12),.8,.26)
tan=mat('Reclaimed cardboard',(.57,.36,.18),0,.8)
tape=mat('Paper packing tape',(.83,.70,.43),0,.7)
window=mat('Teal inspection glass',(.055,.28,.29),.65,.22)
chrome=mat('Brushed aluminium',(.48,.60,.59),.85,.25)

GEOMETRY=[]
def finish(o,name,material,bevel=0):
    o.name=name;o.data.materials.append(material);GEOMETRY.append(o)
    if bevel:
        mod=o.modifiers.new('Machined soft edges','BEVEL');mod.width=bevel;mod.segments=3
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return o

def cube(name,loc,scale,material,bevel=.04,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    finish(o,name,material,bevel)
    if parent:o.parent=parent
    return o

def cyl(name,loc,radius,depth,material,vertices=64,parent=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc)
    o=finish(bpy.context.object,name,material,.025)
    if parent:o.parent=parent
    return o

def torus(name,loc,major,minor,material,parent=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=96,minor_segments=10,location=loc)
    o=finish(bpy.context.object,name,material)
    for f in o.data.polygons:f.use_smooth=True
    if parent:o.parent=parent
    return o

def empty(name):
    o=bpy.data.objects.new(name,None);scene.collection.objects.link(o);return o

def linear(o):
    if o.animation_data and o.animation_data.action:
        action=o.animation_data.action
        for layer in action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for key in fc.keyframe_points:key.interpolation='LINEAR'

def mesh(name,vertices,faces,material):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);return finish(o,name,material)

# A built object, rather than a rotating logo: a miniature circular production line.
cyl('Foundation / shadow catcher',(0,0,.08),3.02,.22,ink,96)
cyl('Stepped aluminium edge',(0,0,.22),2.94,.10,chrome,96)
cyl('Recessed top deck',(0,0,.30),2.88,.13,ink,96)
for radius in [2.0,2.72]:torus('Copper guide rail',(0,0,.61),radius,.035,copper)
for radius in [2.04,2.68]:torus('Graphite running surface',(0,0,.46),radius,.075,slate)
for i in range(56):
    angle=i*math.tau/56
    roller=cyl('Radial conveyor roller',(2.36*math.cos(angle),2.36*math.sin(angle),.48),.055,.58,chrome,12)
    roller.rotation_euler=(0,math.pi/2,angle)
# Center island and an architectural factory with saw-tooth roof.
cyl('Central manufacturing island',(0,0,.52),1.75,.3,slate,80)
cyl('Island inset',(0,0,.69),1.66,.04,ink,80)
cube('Factory lower floor',(0,.16,1.12),(1.65,1.16,.86),cream,.07)
cube('Service doorway',(.25,-.434,1.0),(.42,.035,.62),window,.015)
for x in [-.58,-.28,.58]:cube('Street-facing window',(x,-.435,1.25),(.20,.03,.28),window,.012)
for y in [-.16,.21,.58]:cube('Side inspection window',(.836,y,1.25),(.025,.25,.25),window,.012)
# Individual roof bays have an industrial sawtooth profile.
for j in range(3):
    x0=-.86+j*.58; x1=x0+.58; lo=1.54; hi=1.90
    verts=[(x0,-.46,lo),(x1,-.46,lo),(x1,-.46,hi),(x0,.78,lo),(x1,.78,lo),(x1,.78,hi)]
    roof=mesh('Sawtooth roof bay',verts,[(0,1,2),(3,5,4),(0,3,4,1),(1,4,5,2),(0,2,5,3)],slate)
    cube('Roof daylight strip',(x1+.007,.16,1.72),(.025,1.12,.22),mint,.01)
# Modular tower, recycled copper ventilation and rooftop details.
cyl('Copper recovery stack',(-.91,.57,1.58),.18,1.66,copper,32)
cyl('Stack cap',(-.91,.57,2.43),.23,.10,slate,32)
cyl('Stack dark opening',(-.91,.57,2.49),.14,.015,ink,24)
for z in [1.19,1.53,1.87,2.2]:torus('Stack reinforcement',(-.91,.57,z),.18,.021,chrome)
cube('Sorting console',(.97,.66,1.03),(.34,.40,.60),slate,.05)
cube('Console light',(.98,.44,1.12),(.21,.025,.16),lime,.015)
# Circular reuse arrows, standing as a sculptural sign in front of the factory.
for offset in range(3):
    start=offset*math.tau/3+.12
    pts=[]
    for i in range(21):
        a=start+i*.065
        pts.extend([(1.26*math.cos(a),1.26*math.sin(a),.735),(1.38*math.cos(a),1.38*math.sin(a),.735)])
    obj=mesh('Three-part reuse arrow',pts,[(2*i,2*i+1,2*i+3,2*i+2) for i in range(20)],lime)
    a=start+20*.065;rr=1.32;tx=-math.sin(a);ty=math.cos(a);px=rr*math.cos(a);py=rr*math.sin(a)
    mesh('Reuse arrow head',[(px+.21*tx,py+.21*ty,.738),(px-.10*tx+.14*math.cos(a),py-.10*ty+.14*math.sin(a),.738),(px-.10*tx-.14*math.cos(a),py-.10*ty-.14*math.sin(a),.738)],[(0,1,2)],lime)
# Orbiting pallets carry three distinct by-product families; their movement loops exactly.
for index in range(6):
    carrier=empty(['Copper wire / recovery','Polymer offcuts / reuse','Cardboard / second life'][index%3]+f' {index//3+1}')
    cube('Transport pallet',(0,0,.63),(.57,.48,.13),ink,.025,carrier)
    for x in [-.18,.18]:cube('Pallet runners',(x,0,.55),(.07,.48,.07),chrome,.01,carrier)
    kind=index%3
    if kind==0:
        for z in [.81,.91,1.01]:torus('Copper wire coil',(0,0,z),.18,.037,copper,carrier)
        cyl('Wire reel core',(0,0,.9),.08,.34,ink,20,carrier)
    elif kind==1:
        for j in range(3):
            piece=cube('Clean polymer offcut',((j-1)*.15,0,.84+j%2*.06),(.13,.38,.25),mint,.028,carrier);piece.rotation_euler.z=(j-1)*.17
        cube('Polymer identification tab',(0,-.21,.8),(.22,.025,.10),lime,.008,carrier)
    else:
        cube('Reclaimed cardboard bale',(0,0,.88),(.43,.37,.40),tan,.025,carrier)
        cube('Cardboard tape band',(0,0,1.085),(.08,.38,.012),tape,.004,carrier)
        cube('Cardboard front tape',(0,-.19,.88),(.08,.012,.39),tape,.004,carrier)
    for frame in range(1,242,4):
        phase=(frame-1)/240*math.tau+index*math.tau/6
        carrier.location=(2.36*math.cos(phase),2.36*math.sin(phase),0)
        carrier.rotation_euler.z=phase+math.pi/2
        carrier.keyframe_insert(data_path='location',frame=frame);carrier.keyframe_insert(data_path='rotation_euler',frame=frame)
    linear(carrier)
# Four structural feet and a few fasteners make the miniature feel engineered.
for i in range(4):
    a=i*math.pi/2+math.pi/4
    cyl('Rubber isolation foot',(2.36*math.cos(a),2.36*math.sin(a),-.1),.25,.22,slate,24)
for i in range(12):
    a=i*math.tau/12
    cyl('Deck fastener',(2.84*math.cos(a),2.84*math.sin(a),.38),.037,.03,chrome,8)
# A small scanner gate pulses as the materials pass; no flashing or strobe.
for x in [-.4,.4]:cube('Scanner gate upright',(x,-2.36,1.05),(.09,.13,.98),slate,.02)
cube('Scanner gate bridge',(0,-2.36,1.55),(.9,.15,.11),chrome,.02)
scanner=cube('Material scanner light',(0,-2.45,1.51),(.67,.025,.045),lime,.008)
for frame,factor in [(1,1),(61,.82),(121,1),(181,.82),(241,1)]:
    scanner.scale.x=factor;scanner.keyframe_insert(data_path='scale',frame=frame)
linear(scanner)

scene.frame_set(1)
# Export only the authored sculpture, keeping render lights/camera out of the web asset.
for obj in bpy.context.selected_objects:obj.select_set(False)
for obj in scene.objects:obj.select_set(obj.type in {'MESH','EMPTY'})
bpy.ops.export_scene.gltf(filepath=str(OUT/'material-loop.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='SCENE',export_frame_range=True,export_force_sampling=True,export_anim_scene_split_object=False,export_cameras=False,export_lights=False,export_extras=False)

# Studio setup lives in the .blend and generates the lightweight fallback poster.
world=bpy.data.worlds.new('Warm studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.17,.16,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=world
for name,loc,power,size in [('Key',(1,-4,7),1300,5),('Rim',(-4,1,5),1100,4),('Fill',(4,3,4),850,4)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
camdata=bpy.data.cameras.new('Editorial isometric camera');cam=bpy.data.objects.new('Editorial isometric camera',camdata);scene.collection.objects.link(cam);cam.location=(8,-11,9);cam.rotation_euler=(Vector((0,0,.9))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.type='ORTHO';camdata.ortho_scale=7.6;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.render.resolution_x=1100;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'material-loop-poster.png')
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'design/blender/material-loop.blend'))
bpy.ops.render.render(write_still=True)
print('SCRAPLOOP_MODEL_COMPLETE',flush=True)
