import { displayVerseTimings, getAvailableReciters, getVerseTimings } from './timingUtils.mjs';

console.log('🕌 أمثلة على جلب توقيت الآيات\n');

async function examples() {
    try {
        // مثال 1: توقيت الفاتحة للسديس
        console.log('📖 المثال الأول: توقيت الفاتحة للسديس');
        console.log('=' * 50);
        await displayVerseTimings('sudais', 1);
        
        console.log('\n\n');
        
        // مثال 2: جلب البيانات الخام
        console.log('📊 المثال الثاني: البيانات الخام للفاتحة - السديس');
        console.log('=' * 50);
        const timings = await getVerseTimings('sudais', 1);
        console.log('البيانات كـ JSON:');
        console.log(JSON.stringify(timings, null, 2));
        
        console.log('\n\n');
        
        // مثال 3: قائمة القراء
        console.log('👥 المثال الثالث: قائمة جميع القراء المتاحين');
        console.log('=' * 50);
        const reciters = await getAvailableReciters();
        reciters.forEach((r, i) => {
            console.log(`${i + 1}. ${r.reciter_name} - ${r.reciter_display_name}`);
        });
        
    } catch (error) {
        console.error('خطأ:', error);
    }
}

examples();
