using System;
using System.Linq;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;

namespace CbeMeetingAttendance.Controllers
{
    /// <summary>
    /// Development-only helper that reports this machine's LAN IPv4 addresses so
    /// the frontend can build a phone-accessible URL for the QR code without
    /// hardcoding an IP. Returns 404 outside Development, so it is never exposed
    /// on production deployments.
    /// </summary>
    [ApiController]
    [Route("api/network")]
    public class NetworkController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public NetworkController(IWebHostEnvironment env)
        {
            _env = env ?? throw new ArgumentNullException(nameof(env));
        }

        [HttpGet("ip")]
        public ActionResult GetLocalIps()
        {
            if (!_env.IsDevelopment())
            {
                return NotFound();
            }

            var ips = NetworkInterface.GetAllNetworkInterfaces()
                .Where(n => n.OperationalStatus == OperationalStatus.Up
                            && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                .SelectMany(n => n.GetIPProperties().UnicastAddresses)
                .Select(a => a.Address)
                .Where(a => a.AddressFamily == AddressFamily.InterNetwork)
                .Select(a => a.ToString())
                .Distinct()
                // Prefer the Windows Mobile Hotspot subnet so the QR opens the
                // app on phones connected to the PC's hotspot. Runtime check,
                // not a hardcoded IP — if no hotspot is active the other LAN
                // addresses are returned and the frontend picks the first one.
                .OrderBy(ip => ip.StartsWith("192.168.137.", StringComparison.Ordinal) ? 0 : 1)
                .ToList();

            return Ok(new { success = true, ips });
        }
    }
}
