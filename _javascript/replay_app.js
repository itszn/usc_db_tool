import { log, log_h, show_error } from "./log.js"
import { esc, modal, get_input } from "./util.js"

function replay_app(file) {
    console.log(file);
    const reader = new FileReader();
    reader.onload = function(evt) {
      let db = evt.target.result
      init(db);
    }
    reader.readAsArrayBuffer(file);

    let lanes = new Array(8);
    let stats = new Array(8);
    for (let i=0; i<8; i++)
      stats[i] = [];

    const lane_map = [1,2,5,6,3,4,0,7];
    const lane_names = [
      'Blue Laser',
      'Button A',
      'Button B',
      'Left FX',
      'Right FX',
      'Button C',
      'Button D',
      'Red Laser'
    ];

    let end_time = 0;

    let near_window = 92;
    let crit_window = 46;

    function draw_stats() {
      let scale = 1000/100; // # of seconds per vh
      //let offset = 10 * scale; // Offset before start

      for (let i=0; i<8; i++) {
        lanes[i].css('height', `${end_time / scale}vh`);

        for (let s of stats[i]) {
          if (s.e === undefined) {
            s.e = $('<div>',{
              css: {
                width: 'inherit',
                height: '10px',
                marginTop: '-5px',
                position: 'absolute',
                backgroundColor: ['red','orange','green'][s.rating],
              }
            });
            lanes[i].append(s.e);
            if (s.delta != 0) {
              s.m = $('<div>',{
                css: {
                  width: 'inherit',
                  height: '1px',
                  position: 'absolute',
                  backgroundColor: 'black',
                }
              });
              lanes[i].append(s.m);
            }

            s.e.mouseover(()=>{
              let nv = near_window/scale;
              s.r = $('<div>', {
                css: {
                  height: `${nv}vh`,
                  marginTop: `-${nv/2}vh`,
                  backgroundColor: 'orange',
                  position: 'absolute',
                  width: 'inherit',
                  top: `${s.time/scale}vh`
                }
              });
              let cv = crit_window/scale;
              s.r.append($('<div>',{
                css: {
                  height: `${cv}vh`,
                  marginTop: `-${cv/2}vh`,
                  backgroundColor: 'green',
                  position: 'relative',
                  width: '100%',
                  top: `50%`
                }
              }));
              s.e.css('opacity','.001');
              lanes[i].prepend(s.r);
            }).mouseout(()=>{
                s.e.css('opacity','1');
                s.r.remove();
            });
          }
          let t = (s.time + s.delta) / scale;
          s.e.css('top', `${t}vh`);
          if (s.m) {
            let t = (s.time) / scale;
            s.m.css('top', `${t}vh`);
          }
        }
      }
    }

    function init(data) {
      console.log(data);

      for (let i=0; i<8; i++) {
        lanes[i] = $(`<div/>`, {
          class: `column is-1${i==0?' is-offset-2':''}`,
          css: {
            height: '100vh',
            backgroundColor: 'white',
            border: 'solid 2px',
            padding: '0',
          }
        });
        $('#lanes').append(lanes[i]);
      }

      for (let s of parse_replay(data)) {
        console.assert(s.lane >= 0 && s.lane < 8);
        s.lane = lane_map[s.lane];
        stats[s.lane].push(s);
        if (s.time > end_time) // XXX we can probably just take the last node instead
          end_time = s.time;
      }
      console.log(stats);

      draw_stats();
    }

    function parse_replay(data) {
      const dv = new DataView(data);

      let off = 0;
      const consume = (size)=>{
        let v = off;
        off += size;
        return v;
      }
      const u32 = ()=>dv.getUint32(consume(4), true);
      const i32 = ()=>dv.getInt32(consume(4), true);
      const u16 = ()=>dv.getUint16(consume(2), true);
      const u8 = ()=>dv.getUint8(consume(1), true);
      const i8 = ()=>dv.getInt8(consume(1), true);

      const len = u32();

      let stats = [];
      for (let i=0; i<len; i++) {
        stats.push({
          rating: i8(),
          lane: i8(),
          time: (u16(), i32()),
          delta: i32(),
          hold: u32(),
          holdMax: u32(),
        });
      }
      crit_window = u32();
      near_window = u32();
      return stats;
    }
}

export { replay_app };
