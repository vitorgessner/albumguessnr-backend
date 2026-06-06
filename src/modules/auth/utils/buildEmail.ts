import { env } from '../../../shared/config/env';

/* eslint-disable max-len */
export const buildEmailTemplate = (
    subject: string,
    mainBody: string,
    secondBody?: string,
    url?: string
) => {
    return `<!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AlbumGuessnr</title>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap" rel="stylesheet" type="text/css">
        
        <style>
            body, table, td, p, h1, a {
                font-family: 'Nunito', 'Segoe UI', Helvetica, Arial, sans-serif !important;
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #fdf6ee;">
    
        <table width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; table-layout: fixed; background-color: #fdf6ee   ;">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    <table width="100%" cellspacing="0" cellpadding="0" border="0" style="
                        max-width: 500px; 
                        width: 100%; 
                        border: 3px solid #DAC3BB; 
                        border-radius: 8px; 
                        background-color: #ffffff;
                    ">
                        <tr>
                            <td align="center" style="padding: 48px 24px 64px 24px;">
                                <h1 style="
                                    font-size: 24px; 
                                    font-weight: 800; 
                                    text-transform: uppercase; 
                                    letter-spacing: -0.05em; 
                                    margin: 0 0 20px 0; 
                                    color: #3d405b;
                                ">
                                    AlbumGuessnr
                                </h1>

                                <p style="
                                    font-size: 18px; 
                                    font-weight: 800; 
                                    letter-spacing: -0.05em; 
                                    margin: 0 0 20px 0; 
                                    color: #5d8f7a;
                                ">
                                    ${subject}
                                </p>

                                <p style="
                                    font-size: 16px;
                                    margin: 0; 
                                    color: #475569; 
                                    line-height: 1.6;
                                ">
                                    ${mainBody}
                                </p>

                                ${
                                    secondBody
                                        ? `<p style="
                                    font-size: 16px;
                                    margin: 0 0 30px 0; 
                                    color: #475569; 
                                    line-height: 1.6;
                                ">
                                    ${secondBody}
                                </p>`
                                        : ''
                                }

                               ${
                                   url
                                       ? `<table cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                                <tr>
                                    <td align="center" bgcolor="#e07a5f" style="border-radius: 6px;">
                                        <a href="${env.FRONTEND_URL}${url}" target="_blank" style="
                                            font-size: 16px; 
                                            font-family: sans-serif; 
                                            font-weight: bold; 
                                            color: #ffffff; 
                                            text-decoration: none; 
                                            border-radius: 6px; 
                                            padding: 14px 48px; 
                                            border: 1px solid #e07a5f; 
                                            display: inline-block;
                                        ">
                                            ${url.startsWith('/auth') ? 'Change your password' : 'Verify your email'}
                                        </a>
                                    </td>
                                </tr>
                            </table>`
                                       : ''
                               }
                            </td>
                        </tr>
                    </table>
                    </td>
            </tr>
        </table>
    
    </body>
    </html>`;
};
