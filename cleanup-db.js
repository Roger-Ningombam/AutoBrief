import 'dotenv/config';
import { supabase } from './api/lib/supabase.js';
import fs from 'fs';

const logFile = './cleanup-log.txt';
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

async function cleanupTestBooks() {
    // Clear previous log
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile);

    log('🧹 Starting database cleanup...\n');

    try {
        // 1. Fetch all books
        const { data: allBooks, error } = await supabase
            .from('books')
            .select('id, title, slug, created_at');

        if (error) {
            log('❌ Error fetching books: ' + JSON.stringify(error));
            return;
        }

        log(`📚 Found ${allBooks.length} total book(s) in database\n`);

        // 2. Define test patterns (gibberish detection)
        const testPatterns = [
            /^[^aeiou]{5,}$/i,  // No vowels, 5+ chars
            /^.{1,3}$/,          // Very short
            /^\d+$/,             // Only numbers
            /test|dummy|sample|asdf|qwerty|zzz|xxx/i,
            /^[a-z]{8,}$/i,     // All lowercase 8+ chars (likely gibberish)
        ];

        const booksToDelete = [];
        const booksToKeep = [];

        allBooks.forEach(book => {
            // Check if it matches test patterns
            const isTest = testPatterns.some(pattern => pattern.test(book.title));

            if (isTest) {
                booksToDelete.push(book);
            } else {
                booksToKeep.push(book);
            }
        });

        // 3. Show summary
        log('\n📊 Cleanup Summary:');
        log(`   ✅ Keeping: ${booksToKeep.length} book(s)`);
        log(`   🗑️  Deleting: ${booksToDelete.length} test entry(ies)\n`);

        if (booksToKeep.length > 0) {
            log('📖 Books to KEEP:');
            booksToKeep.forEach(b => log(`   - "${b.title}" (slug: ${b.slug})`));
            log('');
        }

        if (booksToDelete.length > 0) {
            log('🗑️  Test entries to DELETE:');
            booksToDelete.forEach(b => log(`   - "${b.title}" (slug: ${b.slug})`));
            log('');
        }

        // 4. Delete test entries
        if (booksToDelete.length > 0) {
            const idsToDelete = booksToDelete.map(b => b.id);

            const { error: deleteError } = await supabase
                .from('books')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) {
                log('❌ Error during deletion: ' + JSON.stringify(deleteError));
                return;
            }

            log(`✅ Successfully deleted ${booksToDelete.length} test entry(ies)!\n`);
        } else {
            log('✅ No test entries found. Database is clean!\n');
        }

        // 5. Final verification
        const { data: finalBooks } = await supabase
            .from('books')
            .select('id, title');

        log(`📚 Final database state: ${finalBooks.length} book(s) remaining`);
        if (finalBooks.length > 0) {
            finalBooks.forEach(b => log(`   - "${b.title}"`));
        }

        log('\n✅ Cleanup complete! Check cleanup-log.txt for full details.');

    } catch (err) {
        log('❌ Cleanup failed: ' + err.message);
    }
}

cleanupTestBooks();
