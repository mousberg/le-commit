#!/usr/bin/env ts-node

import { exampleEvaluation } from '../evaluateSignals';

async function runTest() {
  console.log('🚀 Starting Signal Evaluation Test...\n');

  try {
    const result = await exampleEvaluation();

    console.log('\n✅ Test completed successfully!');
    console.log(`📊 Evaluated ${result.results.length} signals`);
    console.log(`📈 Overall Score: ${result.overallScore.overallScore.toFixed(2)}`);
    console.log(`⚖️  Weighted Score: ${result.overallScore.weightedScore.toFixed(2)}`);
    console.log(`🚨 High Risk Signals: ${result.highRiskSignals.length}`);

    if (result.highRiskSignals.length > 0) {
      console.log('\n⚠️  HIGH RISK SIGNALS DETECTED:');
      result.highRiskSignals.forEach((signal, index) => {
        console.log(`${index + 1}. ${signal.signal.name}`);
        console.log(`   Score: ${signal.evaluation.evaluation_score.toFixed(2)}`);
        console.log(`   Reason: ${signal.evaluation.reason}`);
        console.log(`   Importance: ${signal.signal.importance}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runTest();
}
