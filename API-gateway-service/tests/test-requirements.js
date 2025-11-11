import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
let jwtToken = '';

const requirements = [
    {
        name: 'Health Check Endpoint',
        test: async () => {
            const response = await axios.get(`${BASE_URL}/health`);
            return response.status === 200 && 
                   response.data.message &&
                   response.data.circuit_breakers;
        }
    },
    {
        name: 'JWT Authentication',
        test: async () => {
            try {
                await axios.post(`${BASE_URL}/api/v1/notify`, {
                    user_id: 'test',
                    template_name: 'test',
                    variables: {}
                });
                return false; // Should not reach here
            } catch (error) {
                return error.response?.status === 401;
            }
        }
    },
    {
        name: 'Notification Request Processing',
        test: async () => {
            const response = await axios.post(`${BASE_URL}/api/v1/notify`, {
                user_id: 'test_user_123',
                template_name: 'welcome_email',
                variables: { name: 'Test User' }
            }, {
                headers: { Authorization: `Bearer ${jwtToken}` }
            });
            return response.status === 202 && 
                   response.data.success === true;
        }
    },
    {
        name: 'Snake_case Response Format',
        test: async () => {
            const response = await axios.post(`${BASE_URL}/api/v1/notify`, {
                user_id: 'test_user_123',
                template_name: 'welcome_email',
                variables: { name: 'Test User' }
            }, {
                headers: { Authorization: `Bearer ${jwtToken}` }
            });
            
            const data = response.data;
            return data.hasOwnProperty('success') &&
                   data.hasOwnProperty('message') &&
                   data.hasOwnProperty('data') &&
                   data.hasOwnProperty('meta') &&
                   data.meta.hasOwnProperty('total_pages') &&
                   data.meta.hasOwnProperty('has_next');
        }
    },
    {
        name: 'Idempotency Support',
        test: async () => {
            const idempotencyKey = `test-${Date.now()}`;
            
            // First request
            await axios.post(`${BASE_URL}/api/v1/notify`, {
                user_id: 'test_user_123',
                template_name: 'welcome_email',
                variables: { name: 'First' }
            }, {
                headers: { 
                    Authorization: `Bearer ${jwtToken}`,
                    'Idempotency-Key': idempotencyKey
                }
            });

            // Second request with same key
            const response = await axios.post(`${BASE_URL}/api/v1/notify`, {
                user_id: 'test_user_123',
                template_name: 'welcome_email',
                variables: { name: 'Second' }
            }, {
                headers: { 
                    Authorization: `Bearer ${jwtToken}`,
                    'Idempotency-Key': idempotencyKey
                }
            });

            return response.data.idempotent === true;
        }
    }
];

async function runTests() {
    console.log('🧪 API GATEWAY REQUIREMENTS TEST\n');
    
    // First generate a JWT token
    try {
        const { generateTestToken } = await import('../src/scripts/generate-test-token.js');
        jwtToken = generateTestToken();
        console.log('✅ Test token generated\n');
    } catch (error) {
        console.log('❌ Failed to generate test token');
        return;
    }

    let passed = 0;
    
    for (const requirement of requirements) {
        try {
            const result = await requirement.test();
            console.log(`${result ? '✅' : '❌'} ${requirement.name}`);
            if (result) passed++;
        } catch (error) {
            console.log(`❌ ${requirement.name} - Error: ${error.message}`);
        }
    }

    console.log(`\n📊 RESULTS: ${passed}/${requirements.length} requirements passed`);
    console.log(passed === requirements.length ? '🎉 All requirements met!' : '⚠️ Some requirements missing');
}

runTests();