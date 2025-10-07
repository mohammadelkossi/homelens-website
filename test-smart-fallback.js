// Test the smart fallback system logic
const extractedData = {
  size: "Ask agent",
  sizeInSqm: null,
  description: "A rare opportunity to acquire this exceptional Grade II listed stone terraced home, set in an elevated and highly sought after position in the heart of Chapel Allerton. Arranged over four floors, and larger than others on the street, this spacious property beautifully blends charming period features with stylish modern touches, creating a home that is both characterful and perfectly suited to contemporary living."
};

console.log('🧪 Testing Smart Fallback System Logic');
console.log('📊 Input data:', extractedData);

// Test the condition
const condition = !extractedData.size || !extractedData.sizeInSqm || extractedData.size === 'Ask agent' || extractedData.size === 'Ask Agent' || extractedData.size?.toLowerCase().includes('ask agent');

console.log('🔍 Condition check:', condition);
console.log('✅ Should trigger fallback:', condition);

if (condition) {
  console.log('🧮 Size missing or "Ask agent", starting smart fallback analysis...');
  
  // Step 1: Try to extract size from property description
  if (extractedData.description && !extractedData.sizeInSqm) {
    console.log('📝 Step 1: Analyzing property description for size clues...');
    
    // Look for size clues in the description
    const sizeClues = [
      'larger than others on the street',
      'spacious',
      'generous',
      'four floors',
      'arranged over'
    ];
    
    const foundClues = sizeClues.filter(clue => 
      extractedData.description.toLowerCase().includes(clue.toLowerCase())
    );
    
    console.log('🔍 Found size clues:', foundClues);
    
    if (foundClues.length > 0) {
      console.log('✅ Size clues found in description - smart fallback would work!');
      console.log('📏 Description contains:', foundClues.join(', '));
    } else {
      console.log('❌ No size clues found in description');
    }
  }
} else {
  console.log('❌ Smart fallback condition not met');
}


