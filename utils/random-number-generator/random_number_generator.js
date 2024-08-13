/**
 * Returns a random number between min and max, max excluded
 * 
 * @deprecated Use RandomNumberCharGenUtils
 * @param {Number} min 
 * @param {Number} max 
 */

function generateRandomInteger(min, max){

    return Math.floor(Math.random() * (max - min)) + min;
}

export default generateRandomInteger;