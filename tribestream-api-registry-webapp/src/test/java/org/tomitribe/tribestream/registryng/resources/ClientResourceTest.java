/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.tomitribe.tribestream.registryng.resources;

import org.apache.openejb.testing.Application;
import org.apache.tomee.embedded.junit.TomEEEmbeddedSingleRunner;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TestRule;
import org.tomitribe.auth.signatures.Algorithm;
import org.tomitribe.tribestream.registryng.service.client.GenericClientService;
import org.tomitribe.tribestream.registryng.test.Registry;

import javax.inject.Inject;
import javax.ws.rs.core.Response;

import java.io.UnsupportedEncodingException;
import java.util.Date;
import java.util.HashMap;

import static java.util.Arrays.asList;
import static javax.ws.rs.client.Entity.entity;
import static javax.ws.rs.core.MediaType.APPLICATION_JSON_TYPE;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

public class ClientResourceTest {
    @Application
    private Registry registry;

    @Rule
    public final TestRule rule = new TomEEEmbeddedSingleRunner.Rule(this);

    @Inject
    private GenericClientService client;

    @Test
    public void allInOneRequest() throws UnsupportedEncodingException {
        final ClientResource.HttpRequest request = new ClientResource.HttpRequest();
        request.setMethod("GET");
        request.setUrl(registry.root() + "/api/spy");
        request.setHeaders(new HashMap<String, String>() {{
            put("Authorization", registry.basicHeader());
            put("Date", new Date(0).toString()); // ensure test can be re-executed
        }});
        request.setOauth2(new ClientResource.OAuth2Header() {{
            setClientId("client");
            setClientSecret("client secret");
            setEndpoint(registry.root() + "/api/mock/oauth2/token");
            setGrantType("password");
            setUsername("testuser");
            setPassword("testpassword");
            setHeader("oauth2");
        }});
        request.setHttpSignature(new ClientResource.HttpSignatureHeader() {{
            setHeaders(asList("(request-target)", "date"));
            setHeader("signature");
            setAlgorithm(Algorithm.HMAC_SHA256.getJmvName());
            setAlias("key");
            setSecret("chut");
        }});
        request.setDigest(new ClientResource.DigestHeader() {{
            setAlgorithm("sha-256");
        }});
        request.setBasic(new ClientResource.BasicHeader() {{
            setUsername("u");
            setPassword("p");
            setHeader("basic");
        }});

        final ClientResource.HttpResponse response = registry.target()
                .path("/api/try")
                .request(APPLICATION_JSON_TYPE)
                .post(entity(request, APPLICATION_JSON_TYPE), ClientResource.HttpResponse.class);
        assertEquals(Response.Status.OK.getStatusCode(), response.getStatus());
        assertTrue(response.getPayload(), response.getPayload().contains("GET/api/spy"));
        assertTrue(response.getPayload(), response.getPayload().contains("digest=sha-256=47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU="));
        assertTrue(response.getPayload(), response.getPayload().contains("basic=Basic dTpwoauth2="));
        assertTrue(response.getPayload(), response.getPayload().contains("bearer awesome-token"));
        assertTrue(response.getPayload(),
                response.getPayload().contains(
                        "signature=Signature keyId=\"key\",algorithm=\"hmac-sha256\",headers=\"(request-target) date\"," +
                        "signature=\"niZ0RzylAhy4DtKNcUZl0441+gUxON9t9GVS+KMfOJk=\""));
    }
}
