var minRot = -90,
    maxRot = 90,
    solveDeg = ( Math.random() * 180 ) - 90,
    solvePadding = 4,
    maxDistFromSolve = 45,
    pinRot = 0,
    cylRot = 0,
    lastMousePos = 0,
    mouseSmoothing = 2,
    keyRepeatRate = 25,
    cylRotSpeed = 3,
    pinDamage = 20,
    pinHealth = 100,
    pinDamageInterval = 150,
    numPins = 3,
    userPushingCyl = false,
    gameOver = false,
    gamePaused = false,
    pin, cyl, driver, cylRotationInterval, pinLastDamaged,
    lockJiggleCooldown = 120,
    lastLockJiggle = 0,
    safeCode = "",
    userCode = "",
    keypadOpen = false;


$(function(){
  
  //pop vars
  pin = $('#pin');
  cyl = $('#cylinder');
  driver = $('#driver');
  
  $('body').on('mousemove', function(e){
    if (lastMousePos && !gameOver && !gamePaused) {
      var pinRotChange = (e.clientX - lastMousePos)/mouseSmoothing;
      pinRot += pinRotChange;
      pinRot = Util.clamp(pinRot,maxRot,minRot);
      pin.css({
        transform: "rotateZ("+pinRot+"deg)"
      })
    }
    lastMousePos = e.clientX;
  });
  $('body').on('mouseleave', function(e){
    lastMousePos = 0;
  });
  
  $('body').on('keydown', function(e){  
    if ( (e.keyCode == 87 || e.keyCode == 65 || e.keyCode == 83 || e.keyCode == 68 || e.keyCode == 37 || e.keyCode == 39) && !userPushingCyl && !gameOver && !gamePaused) {
      pushCyl();
    }
  });
  
  $('body').on('keyup', function(e){
    if ( (e.keyCode == 87 || e.keyCode == 65 || e.keyCode == 83 || e.keyCode == 68 || e.keyCode == 37 || e.keyCode == 39) && !gameOver) {
      unpushCyl();
    }
  });
  
  //TOUCH HANDLERS
  $('body').on('touchstart', function(e){
    console.log('touchStart',e)
    if ( !e.touchList ) {
    }
    else if (e.touchList) {
    }
  })
}); //docready
  
//CYL INTERACTIVITY EVENTS
function pushCyl() {
  var distFromSolve, cylRotationAllowance;
      clearInterval(cylRotationInterval);
      userPushingCyl = true;
      //set an interval based on keyrepeat that will rotate the cyl forward, and if cyl is at or past maxCylRotation based on pick distance from solve, display "bounce" anim and do damage to pick. If pick is within sweet spot params, allow pick to rotate to maxRot and trigger solve functionality
      
      //SO...to calculate max rotation, we need to create a linear scale from solveDeg+padding to maxDistFromSolve - if the user is more than X degrees away from solve zone, they are maximally distant and the cylinder cannot travel at all. Let's start with 45deg. So...we need to create a scale and do a linear conversion. If user is at or beyond max, return 0. If user is within padding zone, return 100. Cyl may travel that percentage of maxRot before hitting the damage zone.
      
      distFromSolve = Math.abs(pinRot - solveDeg) - solvePadding;
      distFromSolve = Util.clamp(distFromSolve, maxDistFromSolve, 0);
     
      cylRotationAllowance = Util.convertRanges(distFromSolve, 0, maxDistFromSolve, 1, 0.02); //oldval is distfromsolve, oldmin is....0? oldMax is maxDistFromSolve, newMin is 100 (we are at solve, so cyl may travel 100% of maxRot), newMax is 0 (we are at or beyond max dist from solve, so cyl may not travel at all - UPDATE - must give cyl just a teensy bit of travel so user isn't hammered);
      cylRotationAllowance = cylRotationAllowance * maxRot;
      
      cylRotationInterval = setInterval(function(){
        cylRot += cylRotSpeed;
        if (cylRot >= maxRot) {
          cylRot = maxRot;
          // do happy solvey stuff
          clearInterval(cylRotationInterval);
          unlock();
        }
        else if (cylRot >= cylRotationAllowance) {
            // หยุดที่ limit
            cylRot = cylRotationAllowance;
          
            // ให้เด้ง/กระตุกเหมือนล็อคต้าน
            jiggleLock();
          
            // ทำดาเมจ
            damagePin();
          }             
        
        cyl.css({
          transform: "rotateZ("+cylRot+"deg)"
        });
        driver.css({
          transform: "rotateZ("+cylRot+"deg)"
        });
      },keyRepeatRate);
}

function unpushCyl(){
  userPushingCyl = false;
      //set an interval based on keyrepeat that will rotate the cyl backward, and if cyl is at or past origin, set to origin and stop.
      clearInterval(cylRotationInterval);
      cylRotationInterval = setInterval(function(){
        cylRot -= cylRotSpeed;
        cylRot = Math.max(cylRot,0);
        cyl.css({
          transform: "rotateZ("+cylRot+"deg)"
        })
        driver.css({
          transform: "rotateZ("+cylRot+"deg)"
        })
        if (cylRot <= 0) {
          cylRot = 0;
          clearInterval(cylRotationInterval);
        }
      },keyRepeatRate);
}

//PIN AND SOLVE EVENTS

function damagePin() {
  if ( !pinLastDamaged || Date.now() - pinLastDamaged > pinDamageInterval) {
    var tl = new TimelineLite();
    pinHealth -= pinDamage;
    console.log('damagePin, pinHealth=',pinHealth)
    pinLastDamaged = Date.now()
    
    //pin damage/lock jiggle animation
    tl.to(pin, (pinDamageInterval/4)/1000, {
      rotationZ: pinRot - 2
    });
    tl.to(pin, (pinDamageInterval/4)/1000, {
      rotationZ: pinRot
    });
    if (pinHealth <= 0) {
      breakPin();
    }
  }
}

function jiggleLock() {
    // กันสั่นถี่เกิน
    if (Date.now() - lastLockJiggle < lockJiggleCooldown) return;
    lastLockJiggle = Date.now();
  
    // เด้งถอยนิด ๆ + สั่นเร็ว ๆ
    var bounceBack = Math.max(cylRot - 2.2, 0);
  
    var tl = new TimelineLite();
    tl.to([cyl, driver], 0.03, { rotationZ: bounceBack });
    tl.to([cyl, driver], 0.03, { rotationZ: cylRot });
    tl.to([cyl, driver], 0.03, { rotationZ: bounceBack + 1 });
    tl.to([cyl, driver], 0.03, { rotationZ: cylRot });
  
    // อัปเดตค่าให้ตรงกับภาพจริง (ทำให้ฟีลชนกำแพง)
    cylRot = bounceBack;
    cyl.css({ transform: "rotateZ(" + cylRot + "deg)" });
    driver.css({ transform: "rotateZ(" + cylRot + "deg)" });
  }
  

function breakPin() {
      var tl, pinTop,pinBott;
      gamePaused = true;
      clearInterval(cylRotationInterval);
      numPins--;
  $('span').text(numPins)
      pinTop = pin.find('.top');
      pinBott = pin.find('.bott');
      tl = new TimelineLite();
      tl.to(pinTop, 0.7, {
              rotationZ: -400,
              x: -200,
              y: -100,
              opacity: 0
            });
      tl.to(pinBott, 0.7, {
        rotationZ: 400,
        x: 200,
        y: 100,
        opacity: 0,
        onComplete: function(){
            if (numPins > 0) {
              // คืนค่าเศษไม้ให้พร้อมรอบถัดไป (กันค้าง)
              TweenLite.set(pinTop, { rotationZ: 0, x: 0, y: 0, opacity: 1 });
              TweenLite.set(pinBott, { rotationZ: 0, x: 0, y: 0, opacity: 1 });
          
              gamePaused = false;
              reset();
            } else {
              outOfPins();
            }
          }
          
      }, 0)
      tl.play();       
}

function reset() {
      //solveDeg = ( Math.random() * 180 ) - 90;
      cylRot = 0;
      pinHealth = 100;
      pinRot = 0;
      pin.css({
        transform: "rotateZ("+pinRot+"deg)"
      })  
      cyl.css({
        transform: "rotateZ("+cylRot+"deg)"
      })  
      driver.css({
        transform: "rotateZ("+cylRot+"deg)"
      })  
      TweenLite.to(pin.find('.top'),0,{
        rotationZ: 0,
        x: 0,
        y: 0,
        opacity: 1
      });
      TweenLite.to(pin.find('.bott'),0,{
        rotationZ: 0,
        x: 0,
        y: 0,
        opacity: 1
      });
}

function outOfPins() {
  gameOver = true;
  $('#lose').css('display','inline-block');
  $('#modal').fadeIn();
}

function unlock() {
    // ไม่ชนะทันที -> ไป keypad ก่อน
    openKeypad();
  }
  

function fullResetGame() {
    // reset state
    gameOver = false;
    gamePaused = false;
    numPins = 3;
    pinHealth = 100;
    pinRot = 0;
    cylRot = 0;
    solveDeg = (Math.random() * 180) - 90;
  
    $('span').text(numPins);
  
    // reset transforms
    pin.css({ transform: "rotateZ(0deg)" });
    cyl.css({ transform: "rotateZ(0deg)" });
    driver.css({ transform: "rotateZ(0deg)" });
  
    TweenLite.to(pin.find('.top'), 0, { rotationZ: 0, x: 0, y: 0, opacity: 1 });
    TweenLite.to(pin.find('.bott'), 0, { rotationZ: 0, x: 0, y: 0, opacity: 1 });
  
    // hide modal
    $('#modal').hide();
    $('#win').hide();
    $('#lose').hide();
  }
  
  // bind buttons
  $(function () {
    $('#resetBtnWin').on('click', fullResetGame);
    $('#resetBtnLose').on('click', fullResetGame);
      // keypad click
  $('body').on('click', '.kpBtn', function(){
    keypadPress($(this).data('k').toString());
  });

  // รองรับกดเลขบนคีย์บอร์ด
  $('body').on('keydown', function(e){
    if (!keypadOpen) return;

    if (e.keyCode >= 48 && e.keyCode <= 57) keypadPress(String(e.keyCode - 48)); // 0-9
    if (e.keyCode >= 96 && e.keyCode <= 105) keypadPress(String(e.keyCode - 96)); // numpad 0-9
    if (e.keyCode === 13) keypadPress("E"); // Enter
    if (e.keyCode === 27 || e.keyCode === 8) keypadPress("C"); // Esc/Backspace => clear
  });

  });

  function random5Digits() {
    // 00000 - 99999 (ให้มีเลขนำหน้าได้)
    return String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  }
  
  function openKeypad() {
    keypadOpen = true;
    gamePaused = true; // หยุดเกมงัด
    safeCode = random5Digits();
    userCode = "";
  
    // โชว์รหัสสุ่มด้านบน
    var digits = safeCode.split("");
    $("#kpCode .kpDigit").each(function(i){
      $(this).text(digits[i] || "-");
    });
  
    renderUserCode();
    $("#kpMsg").text("Enter the 5-digit code.");
    $("#keypadModal").removeClass("km-hidden");
  }
  
  function closeKeypad() {
    keypadOpen = false;
    $("#keypadModal").addClass("km-hidden");
  }
  
  function renderUserCode() {
    var slots = userCode.padEnd(5, " ").split("");
    $("#kpDisplay .kpSlot").each(function(i){
      $(this).text(slots[i]);
    });
  }
  
  function keypadPress(k) {
    if (!keypadOpen) return;
  
    if (k === "C") {
      userCode = "";
      $("#kpMsg").text("Cleared.");
      renderUserCode();
      return;
    }
  
    if (k === "E") {
      if (userCode.length !== 5) {
        $("#kpMsg").text("Need 5 digits.");
        return;
      }
      if (userCode === safeCode) {
        $("#kpMsg").text("Correct!");
        closeKeypad();
        winGame();
      } else {
        $("#kpMsg").text("Wrong code. Try again.");
        userCode = "";
        renderUserCode();
      }
      return;
    }
  
    // 0-9
    if (userCode.length < 5) {
      userCode += k;
      renderUserCode();
    }
  }
  
  function winGame() {
    gameOver = true;
    $('#win').css('display','inline-block');
    $('#modal').fadeIn();
  } 

//UTIL
Util = {};
Util.clamp = function(val,max,min) {
  return Math.min(Math.max(val, min), max);
}
Util.convertRanges = function(OldValue, OldMin, OldMax, NewMin, NewMax) {
  return (((OldValue - OldMin) * (NewMax - NewMin)) / (OldMax - OldMin)) + NewMin
}