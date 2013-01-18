//
// nodeunit tests for musicjson
//

var fs = require('fs'),
    util = require('util'),
    musicjson = require('..');

var __misc = __dirname + '/misc';

exports.basic = {
  'test basic JSON conversion with forced array creation': function (test) {
    var helloWorld = fs.readFileSync(__misc + '/helloworld.xml', 'utf-8');

    test.expect(2);
    music = musicjson.musicJSON(helloWorld, function(err, output) {
      if (err) {
        console.error('An error occured:', err.message);
        return false;
      }

      // test for conversion
      test.equal(output['score-partwise'].$version, '3.0');
      // test for forced aray creation
      test.equal(output['score-partwise'].part[0].$id, 'P1');

      test.done();
    });
  },
  'test "note" position information in "direction" nodes': function (test) {
    var reve = fs.readFileSync(__misc + '/reve.xml', 'utf-8');

    test.expect(3);
    music = musicjson.musicJSON(reve, function(err, output) {
      if (err) {
        console.error('An error occured:', err.message);
        return false;
      }

      // test crescendo information in measure 2 of first part
      // - begin between first and second note
      test.equal(output['score-partwise'].part[0].measure[1].direction[1].noteBefore, 0);
      test.equal(output['score-partwise'].part[0].measure[1].direction[1].noteAfter, 1);
      // - end after third note
      test.equal(output['score-partwise'].part[0].measure[1].direction[2].noteBefore, 2);

      test.done();
    });
  },
  'test for bad short tag interpretation': function (test) {
    var reve = fs.readFileSync(__misc + '/reve.xml', 'utf-8');

    test.expect(2);
    music = musicjson.musicJSON(reve, function(err, output) {
      if (err) {
        console.error('An error occured:', err.message);
        return false;
      }

      test.equal(Object.keys(output['score-partwise'].part[1].measure[0].note[1].chord).length, 0);
      test.equal(output['score-partwise'].part[1].measure[0].note[1].pitch.octave, 4);

      test.done();
    });
  }
};
