import chai from 'chai';
import chaiHttp from 'chai-http';
import { Application } from 'express';
import { mkdtemp, readFile, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { signToken } from '../src/core/auth/helpers';
import { createApp } from '../src/index';
import makeTestData, { writeTestDataToDatabase } from '../src/tools/fake-data-generator';
import { TestDataPayload } from '../src/types';

chai.use(chaiHttp);

/** Path and query of a presigned URL, so chai can request it against the app. */
function localPathOf(url: string): string {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
}

describe('Interact with storage and files', function () {

    let app: Application;
    let testData: TestDataPayload;
    let token: string;
    let uploadDir: string;
    let storedKey: string;

    before(async function () {
        app = await createApp();
        await app.migrator.up();
        testData = makeTestData();
        await writeTestDataToDatabase(app.database, testData);
        uploadDir = await mkdtemp(path.join(os.tmpdir(), 'civic-uploads-'));
        // config is frozen, so swap in a copy that uses the local disk driver
        app.config = { ...app.config, storageDriver: 'local', storageLocalDir: uploadDir };
        token = signToken(app.config, { sub: testData.staffUsers[0].id, kind: 'staff' });
    })

    after(async function () {
        await app.database.drop({});
        await rm(uploadDir, { recursive: true, force: true });
    })

    it('should refuse to presign without signing in', async function () {
        const res = await chai.request(app).post('/storage/presign-put').send({ filename: 'test.jpg' });
        chai.assert.equal(res.status, 401);
    });

    it('should presign an image upload URL and accept the upload', async function () {
        const res = await chai.request(app).post('/storage/presign-put')
            .set('Authorization', `Bearer ${token}`)
            .send({ filename: 'test.jpg' });
        chai.assert.equal(res.status, 200);
        storedKey = res.body.data.filename;
        chai.assert.match(storedKey, /^\d{4}\/\d{2}\/[0-9a-f-]{36}\.jpg$/);
        chai.assert.include(res.body.data.uploadUrl, `/storage/local/${storedKey}`);

        const file = await readFile(`${__dirname}/fixtures/test.jpg`);
        const upload = await chai.request(app).put(localPathOf(res.body.data.uploadUrl))
            .set('Content-Type', 'image/jpeg')
            .send(file);
        chai.assert.equal(upload.status, 200);

        const again = await chai.request(app).put(localPathOf(res.body.data.uploadUrl))
            .set('Content-Type', 'image/jpeg')
            .send(file);
        chai.assert.equal(again.status, 409);
    });

    it('should reject file types that are not photos, videos or PDFs', async function () {
        const res = await chai.request(app).post('/storage/presign-put')
            .set('Authorization', `Bearer ${token}`)
            .send({ filename: 'script.html' });
        chai.assert.equal(res.status, 400);
    });

    it('should not serve a stored image without a valid signature', async function () {
        const res = await chai.request(app).get(`/storage/local/${storedKey}?expires=9999999999&signature=${'0'.repeat(64)}`);
        chai.assert.equal(res.status, 403);
    });

    it('should presign an image get URL and serve the file', async function () {
        const res = await chai.request(app).post('/storage/presign-get')
            .set('Authorization', `Bearer ${token}`)
            .send({ filename: storedKey });
        chai.assert.equal(res.status, 200);
        const download = await chai.request(app).get(localPathOf(res.body.data.retrieveUrl)).buffer(true);
        chai.assert.equal(download.status, 200);
        chai.assert.equal(download.header['content-type'], 'image/jpeg');
        const original = await readFile(`${__dirname}/fixtures/test.jpg`);
        chai.assert.equal(Number(download.header['content-length'] ?? download.body.length), original.length);
    });

    it('should presign several get URLs at once', async function () {
        const res = await chai.request(app).post('/storage/presign-get')
            .set('Authorization', `Bearer ${token}`)
            .send({ filename: [storedKey, '../etc/passwd'] });
        chai.assert.equal(res.status, 200);
        chai.assert.isString(res.body.data.retrieveUrls[storedKey]);
        chai.assert.isNull(res.body.data.retrieveUrls['../etc/passwd']);
    });

    it('should fail presign put when no filename', async function () {
        const res = await chai.request(app).post('/storage/presign-put')
            .set('Authorization', `Bearer ${token}`)
            .send({ filename: undefined });
        chai.assert.equal(res.status, 400);
        chai.assert.equal(res.body.data.message, 'Received an invalid file name.');
        chai.assert.equal(res.body.data.filename, null);
    });

    it('should fail presign get when no filename', async function () {
        const res = await chai.request(app).post('/storage/presign-get')
            .set('Authorization', `Bearer ${token}`)
            .send({ filename: undefined });
        chai.assert.equal(res.status, 400);
        chai.assert.equal(res.body.data.message, 'Received an invalid file name.');
        chai.assert.equal(res.body.data.filename, null);
    });

});
