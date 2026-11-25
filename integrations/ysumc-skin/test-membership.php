<?php
// Run with PHP CLI and the patched OIDCController.php from a staging checkout.
// The fixture supplies an authenticated subject and never opens a database.
namespace Illuminate\Routing { class Controller {} }
namespace App\Models { class User { public const NORMAL = 0; } }
namespace LittleSkin\YggdrasilConnect {
    class Scope {
        public const PROFILE = 'profile', EMAIL = 'email', PROFILE_SELECT = 'select', PROFILE_READ = 'read';
    }
}
namespace SITMinecraft\Launcher\Access { class Membership {} }
namespace {
    final class Member {
        public int $uid = 42, $permission = 0;
        public string $nickname = 'fixture', $client = 'panel-client';
        public function tokenCan($scope) { return $scope === 'profile'; }
        public function yggdrasilToken() { return (object) ['client_id' => $this->client]; }
    }
    function auth() { return new class { public function user() { return $GLOBALS['member']; } }; }
    function response() { return new class { public function json($v) { return $v; } }; }
    function url($path) { return $path; }
    function storage_path($ignored) { return $GLOBALS['clientFile']; }
    function app($service) { return new class { public function describe($user) { return ['role' => 'minister', 'department' => 'operations']; } }; }
    function abort_if($condition, $code) { if ($condition) throw new \RuntimeException('blocked', $code); }
    function check($condition) { if (!$condition) throw new \RuntimeException('Unexpected membership response'); }

    require $argv[1];
    $member = new Member();
    $clientFile = tempnam(sys_get_temp_dir(), 'mcsm-client-');
    try {
        file_put_contents($clientFile, 'panel-client');
        $controller = new \LittleSkin\YggdrasilConnect\Controllers\OIDCController();
        $claim = $controller->getUserInfo()['ysumc_membership'];
        check($claim === ['sub' => '42', 'role' => 'minister', 'department' => 'operations', 'position' => 'minister']);
        $member->client = 'other-client';
        check(!isset($controller->getUserInfo()['ysumc_membership']));
        $member->client = 'panel-client';
        $member->permission = -1;
        try { $controller->getUserInfo(); throw new \RuntimeException('Disabled member accepted'); }
        catch (\RuntimeException $e) { check($e->getCode() === 403); }
        echo "Passed membership, client isolation and disabled-account cases.\n";
    } finally {
        unlink($clientFile);
    }
}
