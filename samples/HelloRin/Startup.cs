﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HelloRin.Models;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace HelloRin
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.Configure<CookiePolicyOptions>(options =>
            {
                // This lambda determines whether user consent for non-essential cookies is needed for a given request.
                options.CheckConsentNeeded = context => true;
                options.MinimumSameSitePolicy = SameSiteMode.None;
            });


            services.AddMvc(options =>
                {
                    options.EnableEndpointRouting = false;
                })
                .AddRinMvcSupport()
                .SetCompatibilityVersion(CompatibilityVersion.Version_3_0);

            services.AddRin(options =>
            {
                // Optional: Use Redis as storage
                // options.RequestRecorder.StorageFactory = Rin.Storage.Redis.RedisRecordStorage.DefaultFactoryWithOptions(redisOptions =>
                // {
                //     redisOptions.ConnectionConfiguration = "[host]";
                // });
                options.RequestRecorder.RetentionMaxRequests = 100;
                options.RequestRecorder.Excludes.Add(request => request.Path.Value.EndsWith(".js") || request.Path.Value.EndsWith(".css") || request.Path.Value.EndsWith(".svg"));
                options.Inspector.ResponseBodyDataTransformers.Add(new RinCustomContentTypeTransformer());
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseRin();
                app.UseRinMvcSupport();
                app.UseDeveloperExceptionPage();
                app.UseRinDiagnosticsHandler();
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
            }

            app.UseStaticFiles();
            app.UseCookiePolicy();

            app.UseMvc(routes =>
            {
                routes.MapRoute(
                    name: "default",
                    template: "{controller=Home}/{action=Index}/{id?}");
            });
        }
    }
}
